export type PushPayload = {
  title: string
  body: string
  icon?: string
  badge?: string
  tag?: string
  timestamp?: number
  data?: {
    url: string
    type: NotificationType
    entityId: string
  }
  actions?: {
    action: string
    title: string
    icon?: string
  }[]
}

export type NotificationType =
  | 'appointment_created'
  | 'appointment_confirmed'
  | 'appointment_cancelled'
  | 'lead_created'
  | 'reminder_failed'

export function appointmentCreatedNotification(params: {
  patientName: string
  procedure: string
  scheduledAt: Date
  appointmentId: string
}): PushPayload {
  const time = params.scheduledAt.toLocaleTimeString('es-CO', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
  const date = params.scheduledAt.toLocaleDateString('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  return {
    title: 'Nueva cita agendada',
    body: `${params.patientName} — ${params.procedure}\n${date} a las ${time}`,
    icon: '/favicon.ico',
    tag: `appointment-${params.appointmentId}`,
    timestamp: Date.now(),
    data: {
      url: `/agenda?highlight=${params.appointmentId}`,
      type: 'appointment_created',
      entityId: params.appointmentId,
    },
    actions: [
      { action: 'view', title: 'Ver cita' },
      { action: 'dismiss', title: 'Descartar' },
    ],
  }
}

export function appointmentConfirmedNotification(params: {
  patientName: string
  appointmentId: string
}): PushPayload {
  return {
    title: 'Paciente confirmó asistencia',
    body: `${params.patientName} confirmó que asistirá a su cita`,
    tag: `confirm-${params.appointmentId}`,
    data: {
      url: `/agenda?highlight=${params.appointmentId}`,
      type: 'appointment_confirmed',
      entityId: params.appointmentId,
    },
    actions: [{ action: 'view', title: 'Ver agenda' }],
  }
}

export function appointmentCancelledNotification(params: {
  patientName: string
  procedure: string
  appointmentId: string
}): PushPayload {
  return {
    title: 'Cita cancelada',
    body: `${params.patientName} canceló su cita de ${params.procedure}`,
    tag: `cancel-${params.appointmentId}`,
    data: {
      url: `/agenda`,
      type: 'appointment_cancelled',
      entityId: params.appointmentId,
    },
  }
}
