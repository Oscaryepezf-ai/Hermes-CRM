import { format } from "date-fns";
import { es } from "date-fns/locale";
import { TREATMENT_LABELS } from "@/types/leads";
import type { DentalTreatment } from "@prisma/client";

type ReminderParams = {
  patientName: string;
  treatment: DentalTreatment | string;
  scheduledAt: Date;
  clinicName: string;
  clinicAddress?: string;
  confirmUrl: string;
};

export function buildReminderMessage(p: ReminderParams): string {
  const firstName = p.patientName.split(" ")[0];
  const dateStr = format(p.scheduledAt, "EEEE d 'de' MMMM", { locale: es });
  const timeStr = format(p.scheduledAt, "h:mm a");
  const treatment =
    TREATMENT_LABELS[p.treatment as DentalTreatment] ?? p.treatment;

  return `¡Hola ${firstName}! 👋

Te recordamos que *mañana* tienes tu cita en *${p.clinicName}*:

📅 *${dateStr}*
🕐 *${timeStr}*
🦷 *${treatment}*${p.clinicAddress ? `\n📍 ${p.clinicAddress}` : ""}

Por favor confirma tu asistencia haciendo clic aquí:
✅ ${p.confirmUrl}

Si necesitas reprogramar, escríbenos y buscamos otro horario.

¡Te esperamos! 😊`;
}

export function buildConfirmationMessage(p: ReminderParams): string {
  const firstName = p.patientName.split(" ")[0];
  const dateStr = format(
    p.scheduledAt,
    "EEEE d 'de' MMMM 'a las' h:mm a",
    { locale: es }
  );
  const treatment =
    TREATMENT_LABELS[p.treatment as DentalTreatment] ?? p.treatment;

  return `¡Hola ${firstName}! ✅

Tu cita ha sido confirmada:

🦷 *${treatment}*
📅 *${dateStr}*
🏥 *${p.clinicName}*${p.clinicAddress ? `\n📍 ${p.clinicAddress}` : ""}

Recibirás un recordatorio 24 horas antes de tu cita.

¿Tienes alguna pregunta? Escríbenos aquí mismo 💬`;
}

export function buildRescheduleMessage(
  patientName: string,
  clinicName: string,
  slots: string[]
): string {
  const firstName = patientName.split(" ")[0];
  const options = slots
    .slice(0, 3)
    .map((s, i) => `${i + 1}️⃣ ${s}`)
    .join("\n");

  return `Hola ${firstName}, entendemos que no puedes asistir mañana 🙏

Tenemos estos horarios disponibles para reagendar tu cita:

${options}

Responde con el número de tu preferencia y lo confirmamos de inmediato ✅`;
}
