"use server";

import { z } from "zod";
import { auth } from "../../../auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getAvailableSlots } from "@/lib/google-calendar/availability";
import {
  createCalendarEvent,
  cancelCalendarEvent,
} from "@/lib/google-calendar/sync";
import {
  isCalendarConnected,
  getAuthorizationUrl,
} from "@/lib/google-calendar/oauth";
import { buildConfirmationMessage } from "@/lib/agendador/whatsapp-templates";
import { completeMission } from "@/lib/onboarding/activation-checklist";

export async function checkCalendarConnection() {
  const session = await auth();
  if (!session?.user?.id) return { connected: false };
  const connected = await isCalendarConnected(session.user.id);
  return { connected };
}

export async function getCalendarAuthUrl() {
  const session = await auth();
  if (!session?.user?.id) return { error: "No autorizado" };
  const url = getAuthorizationUrl(session.user.id);
  return { url };
}

export async function fetchAvailableSlots(
  dentistUserId: string,
  daysAhead = 7
) {
  const session = await auth();
  if (!session?.user?.clinicId) return { success: false, error: "No autorizado" };

  try {
    const slots = await getAvailableSlots(dentistUserId, daysAhead);
    return { success: true, data: slots };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error al consultar Google Calendar";
    return { success: false, error: msg };
  }
}

const CreateAppointmentSchema = z.object({
  leadId: z.string().cuid(),
  patientId: z.string().cuid(),
  dentistId: z.string().cuid(),
  procedure: z.string().min(1),
  startIso: z.string().datetime(),
  endIso: z.string().datetime(),
  value: z.number().optional(),
  notes: z.string().optional(),
});

export async function createAppointmentWithSync(
  data: z.infer<typeof CreateAppointmentSchema>
) {
  const session = await auth();
  if (!session?.user?.clinicId) return { success: false, error: "No autorizado" };

  const parsed = CreateAppointmentSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: "Datos inválidos" };

  try {
    const [patient, clinic] = await Promise.all([
      db.patient.findUniqueOrThrow({ where: { id: data.patientId } }),
      db.clinic.findUniqueOrThrow({ where: { id: session.user.clinicId } }),
    ]);

    const appointment = await db.appointment.create({
      data: {
        patientId: data.patientId,
        clinicId: session.user.clinicId,
        dentistId: data.dentistId,
        procedure: data.procedure,
        scheduledAt: new Date(data.startIso),
        value: data.value,
        notes: data.notes,
        status: "SCHEDULED",
      },
    });

    // Sync to Google Calendar if dentist has it connected
    const connected = await isCalendarConnected(data.dentistId);
    if (connected) {
      try {
        await createCalendarEvent(data.dentistId, appointment.id, {
          title: `Cita: ${patient.fullName} — ${data.procedure}`,
          description: data.notes ?? "Cita agendada desde Hermes CRM",
          startIso: data.startIso,
          endIso: data.endIso,
          patientEmail: patient.email ?? undefined,
          location: clinic.address ?? undefined,
        });
      } catch (calendarErr) {
        // Calendar sync failure is non-fatal — appointment is already created
        console.error("Google Calendar sync failed:", calendarErr);
      }
    }

    // Send WhatsApp confirmation (non-fatal if it fails)
    try {
      await sendWhatsAppConfirmation(patient, clinic, data.procedure, new Date(data.startIso));
    } catch {
      // silent
    }

    // Update lead's last contact date
    await db.lead.update({
      where: { id: data.leadId },
      data: { lastContactAt: new Date(), status: "CITA_AGENDADA" },
    });

    revalidatePath("/pipeline");
    revalidatePath("/appointments");

    completeMission(session.user.clinicId, "CREAR_CITA").catch(() => {});

    return { success: true, data: appointment };
  } catch (error) {
    console.error("Error creating appointment:", error);
    return { success: false, error: "Error al crear la cita" };
  }
}

async function sendWhatsAppConfirmation(
  patient: { fullName: string; phone: string; email: string | null },
  clinic: { name: string; address: string | null },
  procedure: string,
  scheduledAt: Date
) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const message = buildConfirmationMessage({
    patientName: patient.fullName,
    treatment: procedure,
    scheduledAt,
    clinicName: clinic.name,
    clinicAddress: clinic.address ?? undefined,
    confirmUrl: `${appUrl}/settings`,
  });

  await fetch(
    `https://graph.facebook.com/v18.0/${process.env.WHATSAPP_PHONE_ID}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: patient.phone.replace(/\D/g, ""),
        type: "text",
        text: { body: message },
      }),
    }
  );
}

export async function cancelAppointment(appointmentId: string) {
  const session = await auth();
  if (!session?.user?.clinicId) return { success: false, error: "No autorizado" };

  const appt = await db.appointment.findUniqueOrThrow({
    where: { id: appointmentId },
  });

  if (appt.clinicId !== session.user.clinicId) {
    return { success: false, error: "No autorizado" };
  }

  if (appt.googleEventId) {
    try {
      await cancelCalendarEvent(appt.dentistId, appt.googleEventId);
    } catch {
      // Calendar sync failure is non-fatal
    }
  }

  await db.appointment.update({
    where: { id: appointmentId },
    data: { status: "CANCELLED", reminderStatus: "NOT_NEEDED" },
  });

  revalidatePath("/appointments");
  return { success: true };
}
