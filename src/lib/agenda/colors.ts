// Lista única de motivos de cita, compartida por todos los formularios de
// agendamiento (AppointmentModal, ScheduleLeadAppointmentModal) y por el
// mapeo de colores del calendario, para evitar listas duplicadas/divergentes.
export const PROCEDURE_OPTIONS = [
  "Consulta general",
  "Consulta de valoración",
  "Ortodoncia",
  "Implantes",
  "Blanqueamiento",
  "Endodoncia",
  "Limpieza",
  "Cirugía oral",
  "Prótesis",
  "Control",
  "Otro",
]

const PROCEDURE_COLORS: Record<string, { bg: string; text: string }> = {
  "Consulta general":       { bg: "#EFF6FF", text: "#1D4ED8" },
  "Consulta de valoración": { bg: "#F0F9FF", text: "#0369A1" },
  "Ortodoncia":             { bg: "#EEF2FF", text: "#4338CA" },
  "Implantes":              { bg: "#F5F3FF", text: "#6D28D9" },
  "Blanqueamiento":         { bg: "#ECFEFF", text: "#0E7490" },
  "Endodoncia":             { bg: "#FFF1F2", text: "#BE123C" },
  "Limpieza":               { bg: "#ECFDF5", text: "#047857" },
  "Cirugía oral":           { bg: "#FEF2F2", text: "#B91C1C" },
  "Prótesis":               { bg: "#FFFBEB", text: "#B45309" },
  "Control":                { bg: "#F0FDFA", text: "#0F766E" },
  "Otro":                   { bg: "#F8FAFC", text: "#475569" },
}

const DEFAULT_PROCEDURE_COLOR = { bg: "#F8FAFC", text: "#475569" }

// Paleta de bordes para diferenciar doctores — asignación determinística
// por dentistId (hash), sin necesidad de configurar un color por usuario.
const DOCTOR_BORDER_PALETTE = [
  "#4A90E2", "#10B981", "#F59E0B", "#8B5CF6", "#EC4899",
  "#14B8A6", "#F97316", "#6366F1", "#84CC16", "#0EA5E9",
]

function hashString(value: string): number {
  let hash = 0
  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}

export function getDoctorColor(dentistId: string): string {
  return DOCTOR_BORDER_PALETTE[hashString(dentistId) % DOCTOR_BORDER_PALETTE.length]
}

export function getEventColors(procedure: string, dentistId: string) {
  const { bg, text } = PROCEDURE_COLORS[procedure] ?? DEFAULT_PROCEDURE_COLOR
  return {
    backgroundColor: bg,
    textColor: text,
    borderColor: getDoctorColor(dentistId),
  }
}
