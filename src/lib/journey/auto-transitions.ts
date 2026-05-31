import { db } from '@/lib/db'
import { sendPushToClinicAdmins } from '@/lib/push/send-notification'

// Called by POST /api/cron/check-inactive daily at 9 AM
export async function checkAndMarkInactiveLeads(): Promise<{
  marked: number
  errors: number
}> {
  const ninetyDaysAgo = new Date()
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

  // Find PACIENTE_ACTIVO leads with no activity in 90 days
  const candidates = await db.lead.findMany({
    where: {
      journeyState: 'PACIENTE_ACTIVO',
      OR: [
        { lastActivityAt: { lt: ninetyDaysAgo } },
        { lastActivityAt: null, createdAt: { lt: ninetyDaysAgo } },
      ],
    },
    select: { id: true, fullName: true, clinicId: true, journeyState: true },
  })

  let marked = 0
  let errors = 0

  for (const lead of candidates) {
    try {
      await db.$transaction([
        db.lead.update({
          where: { id: lead.id },
          data: {
            journeyState:   'INACTIVO',
            lastActivityAt: new Date(),
          },
        }),
        db.journeyEvent.create({
          data: {
            leadId:      lead.id,
            type:        'STATE_CHANGED',
            fromState:   'PACIENTE_ACTIVO',
            toState:     'INACTIVO',
            isAutomatic: true,
            note:        'Sin actividad por más de 90 días — marcado automáticamente',
          },
        }),
      ])

      // Notify admins about inactive patient
      sendPushToClinicAdmins(lead.clinicId, {
        title: 'Paciente inactivo detectado',
        body:  `${lead.fullName} lleva más de 90 días sin actividad`,
        data:  { url: '/pipeline', type: 'appointment_created', entityId: lead.id },
      }).catch(console.error)

      marked++
    } catch {
      errors++
    }
  }

  return { marked, errors }
}

// Auto-advance lead to CITA_AGENDADA when an appointment is created
export async function onAppointmentCreated(params: {
  leadId:    string
  userId?:   string
  note?:     string
}): Promise<void> {
  const lead = await db.lead.findUnique({
    where:  { id: params.leadId },
    select: { journeyState: true },
  })

  if (!lead) return

  // Only advance if the lead is in a state that allows it
  if (lead.journeyState !== 'CALIFICADO' && lead.journeyState !== 'PROSPECTO') return

  await db.$transaction([
    db.lead.update({
      where: { id: params.leadId },
      data: {
        journeyState:     'CITA_AGENDADA',
        lastActivityAt:   new Date(),
        totalTouchpoints: { increment: 1 },
      },
    }),
    db.journeyEvent.create({
      data: {
        leadId:      params.leadId,
        userId:      params.userId ?? null,
        type:        'APPOINTMENT_CREATED',
        fromState:   lead.journeyState,
        toState:     'CITA_AGENDADA',
        isAutomatic: !params.userId,
        note:        params.note,
      },
    }),
  ])
}

// Auto-advance to EN_CONSULTA when appointment is COMPLETED
export async function onAppointmentCompleted(params: {
  leadId:  string
  userId?: string
}): Promise<void> {
  const lead = await db.lead.findUnique({
    where:  { id: params.leadId },
    select: { journeyState: true },
  })

  if (!lead) return
  if (lead.journeyState !== 'CITA_AGENDADA') return

  await db.$transaction([
    db.lead.update({
      where: { id: params.leadId },
      data: {
        journeyState:     'EN_CONSULTA',
        consultationDate: new Date(),
        lastActivityAt:   new Date(),
        totalTouchpoints: { increment: 1 },
      },
    }),
    db.journeyEvent.create({
      data: {
        leadId:      params.leadId,
        userId:      params.userId ?? null,
        type:        'APPOINTMENT_COMPLETED',
        fromState:   'CITA_AGENDADA',
        toState:     'EN_CONSULTA',
        isAutomatic: !params.userId,
      },
    }),
  ])
}
