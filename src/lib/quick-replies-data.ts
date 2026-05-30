import { TREATMENT_LABELS } from "@/types/leads";
import type { QuickReply } from "@/types/quick-replies";
import type { DentalTreatment } from "@prisma/client";

export const QUICK_REPLIES: QuickReply[] = [
  // ── Entrante ───────────────────────────────────────────────────────────────
  {
    id: "bienvenida-01",
    shortcut: "/bienvenida",
    title: "Saludo inicial",
    emoji: "👋",
    category: "entrante",
    body: `¡Hola {{paciente}}! 😊 Te saluda el equipo de {{clinica}}.
Vimos que te interesaste en {{tratamiento}}.
¿Tienes alguna pregunta o quieres saber sobre nuestros horarios de atención?`,
  },
  {
    id: "consulta-precio",
    shortcut: "/precio",
    title: "Consulta de precio",
    emoji: "💰",
    category: "entrante",
    body: `Hola {{paciente}}, con gusto te informo sobre el costo de {{tratamiento}}.
Para darte un presupuesto exacto, necesitamos hacer una valoración inicial sin costo.
¿Te gustaría agendar una cita esta semana?`,
  },
  {
    id: "primer-contacto-instagram",
    shortcut: "/instagram",
    title: "Llegó por Instagram",
    emoji: "📸",
    category: "entrante",
    body: `¡Hola {{paciente}}! Gracias por escribirnos desde Instagram 😊
Somos especialistas en {{tratamiento}} y nos encantaría ayudarte.
¿Cuándo te queda bien que te llamemos para contarte más?`,
  },
  // ── Agendamiento ───────────────────────────────────────────────────────────
  {
    id: "proponer-cita",
    shortcut: "/cita",
    title: "Proponer horario de cita",
    emoji: "📅",
    category: "agendamiento",
    body: `{{paciente}}, tenemos disponibilidad para tu valoración de {{tratamiento}}:

📍 *Lunes a viernes* de 8:00 AM a 6:00 PM
📍 *Sábados* de 8:00 AM a 1:00 PM

¿Cuál horario te viene mejor? La valoración inicial es *sin costo* 🦷`,
  },
  {
    id: "confirmar-cita",
    shortcut: "/confirmar",
    title: "Confirmar cita agendada",
    emoji: "✅",
    category: "agendamiento",
    body: `¡Listo {{paciente}}! Tu cita de valoración para {{tratamiento}} está confirmada.
Te esperamos el *{{fecha}}*.
Recuerda llegar 10 minutos antes. ¿Tienes alguna pregunta? 😊`,
  },
  {
    id: "recordatorio-cita",
    shortcut: "/recordatorio",
    title: "Recordatorio 24h antes",
    emoji: "⏰",
    category: "agendamiento",
    body: `Hola {{paciente}} 👋, te recordamos que mañana tienes tu cita de {{tratamiento}} en {{clinica}}.
Si necesitas reprogramar, avísanos con tiempo. ¡Te esperamos! 🦷`,
  },
  // ── Seguimiento ────────────────────────────────────────────────────────────
  {
    id: "no-asistio",
    shortcut: "/ausente",
    title: "No asistió a la cita",
    emoji: "🔄",
    category: "seguimiento",
    body: `Hola {{paciente}}, notamos que no pudiste asistir hoy a tu cita de {{tratamiento}}.
¡No hay problema! ¿Cuándo podemos reprogramarla?
Tenemos disponibilidad esta semana 📅`,
  },
  {
    id: "presupuesto-frio",
    shortcut: "/presupuesto",
    title: "Presupuesto en evaluación",
    emoji: "💭",
    category: "seguimiento",
    body: `Hola {{paciente}}, ¿cómo estás? 😊
Quería saber si tuviste la oportunidad de revisar el presupuesto de {{tratamiento}}.
¿Tienes alguna duda que pueda resolver?`,
  },
  {
    id: "reenganche-frio",
    shortcut: "/rescate",
    title: "Reactivar lead frío",
    emoji: "🌟",
    category: "seguimiento",
    body: `¡Hola {{paciente}}! Espero que estés muy bien 😊
Sé que hablamos hace un tiempo sobre {{tratamiento}}.
Hoy quería contarte que tenemos una *promoción especial* este mes.
¿Te gustaría que te cuente los detalles?`,
  },
];

export function resolveQuickReply(
  template: QuickReply,
  lead: { fullName: string; treatment: DentalTreatment },
  clinicName: string
): string {
  const firstName = lead.fullName.split(" ")[0];

  return template.body
    .replace(/\{\{paciente\}\}/g,    firstName)
    .replace(/\{\{tratamiento\}\}/g, TREATMENT_LABELS[lead.treatment])
    .replace(/\{\{clinica\}\}/g,     clinicName)
    .replace(/\{\{fecha\}\}/g,       "— por confirmar —");
}
