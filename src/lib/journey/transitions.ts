import { db } from '@/lib/db'
import { canTransition, TRANSITION_EVENT } from './state-machine'
import { sendPushToClinicAdmins } from '@/lib/push/send-notification'
import type { JourneyState, LostReason } from '@prisma/client'
import type { SessionUser } from '@/types/rbac'

type TransitionResult =
  | { success: true;  leadId: string; newState: JourneyState }
  | { success: false; error: string }

export async function transitionLead(params: {
  leadId:       string
  toState:      JourneyState
  user:         SessionUser
  note?:        string
  metadata?:    Record<string, unknown>
  isAutomatic?: boolean
}): Promise<TransitionResult> {
  const lead = await db.lead.findUnique({
    where:  { id: params.leadId },
    select: { journeyState: true, clinicId: true, fullName: true },
  })

  if (!lead) return { success: false, error: 'Lead no encontrado' }
  if (lead.clinicId !== params.user.clinicId) {
    return { success: false, error: 'No autorizado' }
  }

  if (!canTransition(lead.journeyState, params.toState)) {
    return {
      success: false,
      error: `No se puede pasar de ${lead.journeyState} a ${params.toState}`,
    }
  }

  const eventType = TRANSITION_EVENT[
    `${lead.journeyState}_${params.toState}` as keyof typeof TRANSITION_EVENT
  ] ?? 'STATE_CHANGED'

  const leadUpdateData: Parameters<typeof db.lead.update>[0]['data'] = {
    journeyState:     params.toState,
    lastActivityAt:   new Date(),
    totalTouchpoints: { increment: 1 },
  }
  if (params.toState === 'PERDIDO') leadUpdateData.lostAt = new Date()
  if (params.metadata?.lostReason) {
    leadUpdateData.lostReason = params.metadata.lostReason as LostReason
  }

  await db.$transaction([
    db.lead.update({ where: { id: params.leadId }, data: leadUpdateData }),
    db.journeyEvent.create({
      data: {
        leadId:      params.leadId,
        userId:      params.isAutomatic ? null : params.user.id,
        type:        eventType,
        fromState:   lead.journeyState,
        toState:     params.toState,
        note:        params.note,
        metadata:    params.metadata ? JSON.parse(JSON.stringify(params.metadata)) : undefined,
        isAutomatic: params.isAutomatic ?? false,
      },
    }),
  ])

  if (params.toState === 'PACIENTE_ACTIVO') {
    sendPushToClinicAdmins(params.user.clinicId, {
      title: '¡Nuevo paciente convertido!',
      body:  `${lead.fullName} acaba de confirmar su tratamiento`,
      data:  { url: '/pipeline', type: 'appointment_created', entityId: params.leadId },
    }).catch(console.error)
  }

  return { success: true, leadId: params.leadId, newState: params.toState }
}

export async function convertLeadToPatient(params: {
  leadId:          string
  user:            SessionUser
  conversionValue: number
  note?:           string
}): Promise<TransitionResult & { patientId?: string }> {
  const lead = await db.lead.findUnique({
    where:  { id: params.leadId },
    select: {
      journeyState: true, clinicId: true,
      fullName: true, phone: true, email: true,
    },
  })

  if (!lead) return { success: false, error: 'Lead no encontrado' }
  if (lead.clinicId !== params.user.clinicId) {
    return { success: false, error: 'No autorizado' }
  }

  if (!canTransition(lead.journeyState, 'PACIENTE_ACTIVO')) {
    return {
      success: false,
      error: `Solo se puede convertir un lead en estado EN_CONSULTA`,
    }
  }

  let patient = await db.patient.findFirst({
    where: { phone: lead.phone, clinicId: params.user.clinicId },
  })

  if (!patient) {
    patient = await db.patient.create({
      data: {
        fullName: lead.fullName,
        phone:    lead.phone,
        email:    lead.email,
        clinicId: params.user.clinicId,
      },
    })
  }

  await db.$transaction([
    db.lead.update({
      where: { id: params.leadId },
      data: {
        journeyState:     'PACIENTE_ACTIVO',
        conversionValue:  params.conversionValue,
        convertedAt:      new Date(),
        patientId:        patient.id,
        lastActivityAt:   new Date(),
        totalTouchpoints: { increment: 1 },
      },
    }),
    db.journeyEvent.create({
      data: {
        leadId:    params.leadId,
        userId:    params.user.id,
        type:      'CONVERTED_TO_PATIENT',
        fromState: lead.journeyState,
        toState:   'PACIENTE_ACTIVO',
        note:      params.note,
        metadata:  { conversionValue: params.conversionValue, patientId: patient.id },
      },
    }),
  ])

  sendPushToClinicAdmins(params.user.clinicId, {
    title: '¡Nuevo paciente convertido!',
    body:  `${lead.fullName} — $${params.conversionValue.toLocaleString()} USD registrados`,
    data:  { url: '/pipeline', type: 'appointment_created', entityId: params.leadId },
  }).catch(console.error)

  return { success: true, leadId: params.leadId, newState: 'PACIENTE_ACTIVO', patientId: patient.id }
}
