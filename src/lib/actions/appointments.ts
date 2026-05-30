"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { auth } from "../../../auth";
import type { ActionResponse, AppointmentWithRelations } from "@/types";

const createAppointmentSchema = z.object({
  patientId: z.string().min(1, "Paciente requerido"),
  dentistId: z.string().min(1, "Dentista requerido"),
  procedure: z.string().min(2, "Procedimiento requerido"),
  value: z.number().positive().optional(),
  scheduledAt: z.string().min(1, "Fecha requerida"),
  notes: z.string().optional(),
});

async function getSession() {
  const session = await auth();
  if (!session?.user?.clinicId) throw new Error("No autorizado");
  return session;
}

export async function createAppointment(
  data: z.infer<typeof createAppointmentSchema>
): Promise<ActionResponse<{ id: string }>> {
  try {
    const session = await getSession();
    const parsed = createAppointmentSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const patient = await db.patient.findUnique({ where: { id: parsed.data.patientId } });
    if (!patient || patient.clinicId !== session.user.clinicId) {
      return { success: false, error: "Paciente no válido" };
    }

    const appointment = await db.appointment.create({
      data: {
        patientId: parsed.data.patientId,
        dentistId: parsed.data.dentistId,
        procedure: parsed.data.procedure,
        value: parsed.data.value || null,
        scheduledAt: new Date(parsed.data.scheduledAt),
        notes: parsed.data.notes || null,
        clinicId: session.user.clinicId,
      },
    });

    return { success: true, data: { id: appointment.id } };
  } catch (error) {
    console.error("[createAppointment]", error);
    return { success: false, error: "Error al crear la cita" };
  }
}

export async function updateAppointmentStatus(
  id: string,
  status: "SCHEDULED" | "CONFIRMED" | "COMPLETED" | "CANCELLED" | "NO_SHOW"
): Promise<ActionResponse<void>> {
  try {
    const session = await getSession();

    const appointment = await db.appointment.findUnique({ where: { id } });
    if (!appointment || appointment.clinicId !== session.user.clinicId) {
      return { success: false, error: "Cita no encontrada" };
    }

    await db.appointment.update({
      where: { id },
      data: { status },
    });

    return { success: true, data: undefined };
  } catch (error) {
    console.error("[updateAppointmentStatus]", error);
    return { success: false, error: "Error al actualizar la cita" };
  }
}

export async function getAppointmentsByClinic(dateRange?: {
  from: Date;
  to: Date;
}): Promise<ActionResponse<AppointmentWithRelations[]>> {
  try {
    const session = await getSession();

    const appointments = await db.appointment.findMany({
      where: {
        clinicId: session.user.clinicId,
        ...(dateRange && {
          scheduledAt: {
            gte: dateRange.from,
            lte: dateRange.to,
          },
        }),
      },
      include: {
        patient: { select: { id: true, fullName: true, phone: true } },
        dentist: { select: { id: true, name: true } },
      },
      orderBy: { scheduledAt: "asc" },
    });

    return { success: true, data: appointments as AppointmentWithRelations[] };
  } catch (error) {
    console.error("[getAppointmentsByClinic]", error);
    return { success: false, error: "Error al obtener las citas" };
  }
}

export async function getUpcomingAppointments(): Promise<
  ActionResponse<AppointmentWithRelations[]>
> {
  try {
    const session = await getSession();
    const now = new Date();
    const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000);

    const appointments = await db.appointment.findMany({
      where: {
        clinicId: session.user.clinicId,
        scheduledAt: { gte: now, lte: in48h },
        status: { in: ["SCHEDULED", "CONFIRMED"] },
      },
      include: {
        patient: { select: { id: true, fullName: true, phone: true } },
        dentist: { select: { id: true, name: true } },
      },
      orderBy: { scheduledAt: "asc" },
    });

    return { success: true, data: appointments as AppointmentWithRelations[] };
  } catch (error) {
    console.error("[getUpcomingAppointments]", error);
    return { success: false, error: "Error al obtener las citas próximas" };
  }
}
