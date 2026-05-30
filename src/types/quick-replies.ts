export type QuickReplyCategory =
  | "entrante"      // Primer contacto / rompehielos
  | "agendamiento"  // Confirmación y opciones de cita
  | "seguimiento"   // Rescate de leads fríos o ausentes

export type QuickReply = {
  id:       string              // slug único: "bienvenida-01"
  shortcut: string              // "/bienvenida" — el trigger con barra
  title:    string              // "Saludo inicial"
  body:     string              // Texto completo con {{variables}}
  category: QuickReplyCategory
  emoji:    string              // Emoji representativo para el menú
}

// Variables soportadas en body:
// {{paciente}}    → primer nombre del lead
// {{tratamiento}} → TREATMENT_LABELS[lead.treatment]
// {{clinica}}     → clinic.name
// {{fecha}}       → "— por confirmar —" hasta que haya integración de calendario

export type ResolvedQuickReply = Omit<QuickReply, "body"> & {
  body: string  // body con variables ya reemplazadas
}
