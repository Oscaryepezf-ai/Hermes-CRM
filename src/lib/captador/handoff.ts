import { db } from '@/lib/db'
import { sendPushToClinicAdmins } from '@/lib/push/send-notification'
import { moveLeadToStageBySlug }  from '@/lib/pipeline/auto-stage-sync'
import { capiFire_CompleteRegistration } from '@/lib/meta/conversions-api'
import type { QualificationResult } from './qualification-engine'

const QUALIFYING_INTENTS = new Set(['consulta_precio', 'agendar_cita', 'urgencia_dental'])

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

  // Contactado → Calificado en el Pipeline (solo si el intent indica interés real)
  if (QUALIFYING_INTENTS.has(params.qualification.intent)) {
    moveLeadToStageBySlug(params.leadId, params.clinicId, 'calificado', `intent: ${params.qualification.intent}`).catch(console.error)
  }

  // CAPI: CompleteRegistration — lead fully qualified, ready for human follow-up
  const lead = await db.lead.findUnique({
    where:  { id: params.leadId },
    select: { phone: true, email: true },
  })
  if (lead) {
    capiFire_CompleteRegistration({
      phone:     lead.phone,
      email:     lead.email,
      treatment: params.qualification.treatment,
    })
  }

  // Push notification with lead data
  const urgencyEmoji =
    params.qualification.urgency === 'alta'  ? '🔴' :
    params.qualification.urgency === 'media' ? '🟡' : '🟢'

  const name      = (params.collectedData.name as string | undefined) ?? 'Nuevo prospecto'
  const treatment = params.qualification.treatment ?? 'tratamiento por confirmar'

  // #4 — Check if any human agent is assigned in the Inbox; alert if handoff is unattended
  const inboxConv = await db.inboxConversation.findFirst({
    where:  { leadId: params.leadId, clinicId: params.clinicId },
    select: { assignedToId: true },
  })
  const isUnattended = !inboxConv?.assignedToId

  const pushTitle = isUnattended
    ? `⚠️ Handoff sin agente — ${urgencyEmoji} ${name}`
    : `${urgencyEmoji} Lead calificado por Hermes`
  const pushBody = isUnattended
    ? `Nadie asignado · ${treatment} · Urgencia ${params.qualification.urgency}. Asigna un agente ahora.`
    : `${name} · ${treatment} · Urgencia ${params.qualification.urgency}`

  await sendPushToClinicAdmins(params.clinicId, {
    title: pushTitle,
    body:  pushBody,
    data:  { url: `/patients/${params.leadId}`, type: 'appointment_created', entityId: params.leadId },
  }).catch(console.error)
}
