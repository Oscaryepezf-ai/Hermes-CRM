import { db } from "@/lib/db";
import { addHours } from "date-fns";
import { buildReminderMessage } from "./whatsapp-templates";

async function sendWhatsAppMessage(
  phone: string,
  message: string
): Promise<boolean> {
  try {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${process.env.WHATSAPP_PHONE_ID}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: phone.replace(/\D/g, ""),
          type: "text",
          text: { body: message },
        }),
      }
    );
    return response.ok;
  } catch {
    return false;
  }
}

export async function processAppointmentReminders(): Promise<{
  processed: number;
  sent: number;
  failed: number;
}> {
  const now = new Date();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://hermescrm.app";

  // Appointments in the 20–28h window that haven't received a reminder yet
  const appointments = await db.appointment.findMany({
    where: {
      status: { in: ["SCHEDULED", "CONFIRMED"] },
      reminderStatus: "PENDING",
      scheduledAt: {
        gte: addHours(now, 20),
        lte: addHours(now, 28),
      },
    },
    include: {
      patient: { select: { fullName: true, phone: true } },
      clinic: { select: { name: true, address: true } },
    },
  });

  let sent = 0;
  let failed = 0;

  for (const appt of appointments) {
    try {
      const confirmUrl = `${appUrl}/confirm/${appt.confirmationCode}`;

      const message = buildReminderMessage({
        patientName: appt.patient.fullName,
        treatment: appt.procedure,
        scheduledAt: appt.scheduledAt,
        clinicName: appt.clinic.name,
        clinicAddress: appt.clinic.address ?? undefined,
        confirmUrl,
      });

      const ok = await sendWhatsAppMessage(appt.patient.phone, message);

      await db.appointment.update({
        where: { id: appt.id },
        data: {
          reminderStatus: ok ? "SENT" : "FAILED",
          reminderSentAt: ok ? now : undefined,
        },
      });

      ok ? sent++ : failed++;

      // Respect WhatsApp rate limits
      await new Promise((r) => setTimeout(r, 500));
    } catch (error) {
      console.error(`Error sending reminder for appointment ${appt.id}:`, error);
      await db.appointment.update({
        where: { id: appt.id },
        data: { reminderStatus: "FAILED" },
      });
      failed++;
    }
  }

  return { processed: appointments.length, sent, failed };
}
