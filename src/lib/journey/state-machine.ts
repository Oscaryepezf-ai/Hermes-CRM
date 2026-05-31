import type { JourneyState, EventType } from '@prisma/client'

export const VALID_TRANSITIONS: Record<JourneyState, JourneyState[]> = {
  PROSPECTO:       ['CALIFICADO', 'PERDIDO'],
  CALIFICADO:      ['CITA_AGENDADA', 'PROSPECTO', 'PERDIDO'],
  CITA_AGENDADA:   ['EN_CONSULTA', 'CALIFICADO', 'PERDIDO'],
  EN_CONSULTA:     ['PACIENTE_ACTIVO', 'CITA_AGENDADA', 'PERDIDO'],
  PACIENTE_ACTIVO: ['INACTIVO'],
  INACTIVO:        ['PACIENTE_ACTIVO', 'PERDIDO'],
  PERDIDO:         ['CALIFICADO'],
}

export const TRANSITION_EVENT: Partial<Record<`${JourneyState}_${JourneyState}`, EventType>> = {
  PROSPECTO_CALIFICADO:          'STATE_CHANGED',
  CALIFICADO_CITA_AGENDADA:      'APPOINTMENT_CREATED',
  CITA_AGENDADA_EN_CONSULTA:     'STATE_CHANGED',
  EN_CONSULTA_PACIENTE_ACTIVO:   'CONVERTED_TO_PATIENT',
  PACIENTE_ACTIVO_INACTIVO:      'STATE_CHANGED',
  INACTIVO_PACIENTE_ACTIVO:      'AI_REENGAGED',
  PERDIDO_CALIFICADO:            'STATE_CHANGED',
}

export const STATE_CONFIG: Record<JourneyState, {
  label:       string
  description: string
  color:       string
  icon:        string
  nextAction:  string
}> = {
  PROSPECTO: {
    label:      'Prospecto',
    description: 'Acaba de llegar, sin calificar',
    color:      'bg-blue-100 text-blue-700',
    icon:       'UserPlus',
    nextAction: 'Responder en menos de 1 minuto y calificar el interés',
  },
  CALIFICADO: {
    label:      'Calificado',
    description: 'Interés y tratamiento confirmados',
    color:      'bg-violet-100 text-violet-700',
    icon:       'BadgeCheck',
    nextAction: 'Proponer fecha de cita de valoración',
  },
  CITA_AGENDADA: {
    label:      'Cita agendada',
    description: 'Tiene cita programada',
    color:      'bg-amber-100 text-amber-700',
    icon:       'CalendarCheck',
    nextAction: 'Enviar recordatorio 24h antes y confirmar asistencia',
  },
  EN_CONSULTA: {
    label:      'En consulta',
    description: 'Siendo atendido en la clínica',
    color:      'bg-teal-100 text-teal-700',
    icon:       'Stethoscope',
    nextAction: 'Completar historia clínica y presentar plan de tratamiento',
  },
  PACIENTE_ACTIVO: {
    label:      'Paciente activo',
    description: 'Tratamiento en curso',
    color:      'bg-green-100 text-green-700',
    icon:       'HeartPulse',
    nextAction: 'Agendar siguiente sesión según el plan de tratamiento',
  },
  INACTIVO: {
    label:      'Inactivo',
    description: 'Sin cita en más de 90 días',
    color:      'bg-gray-100 text-gray-600',
    icon:       'Clock',
    nextAction: 'Activar Hermes Reactivador para recuperar al paciente',
  },
  PERDIDO: {
    label:      'Perdido',
    description: 'Descartado formalmente',
    color:      'bg-red-100 text-red-700',
    icon:       'XCircle',
    nextAction: 'Registrar el motivo para mejorar el proceso',
  },
}

export function canTransition(from: JourneyState, to: JourneyState): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false
}

export function getNextStates(current: JourneyState): JourneyState[] {
  return VALID_TRANSITIONS[current] ?? []
}
