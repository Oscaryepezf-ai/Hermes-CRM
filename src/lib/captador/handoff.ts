import { db } from '@/lib/db'
import { sendPushToClinicAdmins } from '@/lib/push/send-notification'
import type { QualificationResult } from './qualification-engine'

export async function handoffToHuman(params: {
  leadId:        string
  clinicId:      string
  reason:        string
  qualification: QualificationResult
  collectedData: Record<string, unknown>
}): Promise<void> {
  // Update conversation status
  await db.agentConversation.update({
    where: { leadId: params.leadId },
    data: {
      status:       'HANDED_OFF',
      handedOffAt:  new Date(),
      handoffReason: params.reason,
    },
  })

  // Advance lead to CALIFICADO
  await db.lead.update({
    where: { id: params.leadId },
    data: {
      journeyState:   'CALIFICADO',
      isAgentHandled: true,
      lastActivityAt: new Date(),
      // Apply detected treatment
      ...(params.qualification.treatment && {
        treatment: params.qualification.treatment,
      }),
    },
  })

  // Journey event
  await db.journeyEvent.create({
    data: {
      leadId:      params.leadId,
      type:        'AI_QUALIFIED',
      toState:     'CALIFICADO',
      isAutomatic: true,
      metadata:    JSON.parse(JSON.stringify({
        agent:         'CAPTADOR',
        reason:        params.reason,
        qualification: params.qualification,
        collectedData: params.collectedData,
      })),
      note: `Hermes Captador calificó el lead. Tratamiento: ${params.qualification.treatment ?? 'por confirmar'}. Urgencia: ${params.qualification.urgency}`,
    },
  })

  // Push notification with lead data
  const urgencyEmoji =
    params.qualification.urgency === 'alta'  ? '🔴' :
    params.qualification.urgency === 'media' ? '🟡' : '🟢'

  const name     = (params.collectedData.name as string | undefined) ?? 'Nuevo prospecto'
  const treatment = params.qualification.treatment ?? 'tratamiento por confirmar'

  await sendPushToClinicAdmins(params.clinicId, {
    title: `${urgencyEmoji} Lead calificado por Hermes`,
    body:  `${name} · ${treatment} · Urgencia ${params.qualification.urgency}`,
    data:  { url: '/pipeline', type: 'appointment_created', entityId: params.leadId },
  }).catch(console.error)
}
