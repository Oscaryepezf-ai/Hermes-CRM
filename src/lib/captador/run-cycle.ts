import { db } from '@/lib/db'
import { routeIncomingMessage } from './conversation-router'
import { qualifyMessage }       from './qualification-engine'
import { generateCaptadorResponse, getHandoffMessage, getOutOfHoursMessage } from './response-generator'
import { handoffToHuman }       from './handoff'
import { sendWhatsAppMessageForClinic } from '@/lib/whatsapp/client'
import { sendMessengerMessage }    from '@/lib/meta/messenger-client'
import { sendInstagramMessage }    from '@/lib/meta/instagram-client'
import { getChannelAccessToken }   from '@/lib/meta/lead-from-messenger'
import type { MarketingChannel }   from '@prisma/client'
import { moveLeadToStageBySlug }   from '@/lib/pipeline/auto-stage-sync'
import { capiFire_Contact }        from '@/lib/meta/conversions-api'

export async function runCaptadorCycle(params: {
  leadId:    string
  message:   string
  channel:   MarketingChannel
  /** Id del botón de WhatsApp tocado por el prospecto (solo modo "flujo"). */
  buttonId?: string
}): Promise<void> {
  // Guard: only process text messages
  if (!params.message?.trim()) return

  // #3 — Reset journeyState for dormant leads (inactive > 30 days)
  // Prevents the agent from resuming a stale conversation as if no time passed.
  await resetDormantConversation(params.leadId)

  const decision = await routeIncomingMessage({
    leadId:  params.leadId,
    channel: params.channel,
  })

  // If max_turns reached and still active → do handoff silently
  if (!decision.shouldAgentRespond) {
    if (
      decision.reason === 'max_turns_reached' &&
      decision.existingConversation?.status === 'ACTIVE'
    ) {
      await handoffToHuman({
        leadId:        params.leadId,
        clinicId:      decision.clinic.id,
        reason:        'max_turns',
        qualification: { intent: 'saludo_inicial', treatment: null, urgency: 'media',
                         sentiment: 'neutro', extractedName: null, extractedBudget: null,
                         extractedBestTime: null, shouldRespond: true, shouldHandOff: false, confidence: 0.5,
                         detectedNeed: null, newObjection: null, resolvedObjection: null, emotionalState: null },
        collectedData: (decision.existingConversation?.collectedData as Record<string, unknown>) ?? {},
      })
    }
    return
  }

  const { clinic, config, existingConversation: conv, isBusinessHours } = decision

  if (config.mode === 'consultivo') {
    const { generateConsultativeResponse } = await import('@/lib/sales-agent/response-engine')
    await generateConsultativeResponse({
      leadId:     params.leadId,
      message:    params.message,
      channel:    params.channel,
      clinicId:   clinic.id,
      clinicName: clinic.name,
    })
    return
  }

  if (config.mode === 'flujo') {
    const { runFlowCycle } = await import('@/lib/flows/run-flow')
    await runFlowCycle({
      leadId:    params.leadId,
      clinicId:  clinic.id,
      flowId:    config.flowId,
      buttonId:  params.buttonId,
      channel:   params.channel,
    })
    return
  }

  // Fetch recent messages for context (last 20)
  const recentMsgs = await db.message.findMany({
    where:   { leadId: params.leadId },
    orderBy: { sentAt: 'asc' },
    take:    20,
  })

  const history = recentMsgs.map(m => ({
    role:    m.direction === 'INBOUND' ? 'user' as const : 'assistant' as const,
    content: m.content,
  }))

  const collectedData = (conv?.collectedData as Record<string, unknown>) ?? {}

  // Qualify intent
  const qualification = await qualifyMessage({
    message:             params.message,
    conversationHistory: history.slice(-6),
    clinicName:          clinic.name,
    clinicId:            clinic.id,
    collectedSoFar:      collectedData,
  })

  // Update collected data
  const updatedData: Record<string, unknown> = {
    ...collectedData,
    ...(qualification.extractedName     && { name:     qualification.extractedName }),
    ...(qualification.extractedBudget   && { budget:   qualification.extractedBudget }),
    ...(qualification.extractedBestTime && { bestTime: qualification.extractedBestTime }),
    ...(qualification.treatment         && { treatment: qualification.treatment }),
    urgency: qualification.urgency,
  }

  // Immediate handoff: urgency or complaint
  if (qualification.shouldHandOff) {
    const reason = qualification.intent === 'urgencia_dental' ? 'urgencia' : 'queja'
    await sendAgentReply(params.leadId, getHandoffMessage(clinic.name, reason), params.channel, clinic.id)
    await handoffToHuman({ leadId: params.leadId, clinicId: clinic.id, reason, qualification, collectedData: updatedData })
    return
  }

  // Out of hours — only on first contact (turnCount === 0)
  if (!isBusinessHours && (conv?.turnCount ?? 0) === 0) {
    const hours = `lunes a sábado ${config.businessHours.start}:00 AM - ${config.businessHours.end}:00`
    await sendAgentReply(params.leadId, getOutOfHoursMessage(clinic.name, hours), params.channel, clinic.id)
    return
  }

  // Should not respond (off-topic)
  if (!qualification.shouldRespond) return

  // Generate response
  const newTurnCount = (conv?.turnCount ?? 0) + 1
  const response = await generateCaptadorResponse(
    [...history, { role: 'user', content: params.message }],
    {
      clinicId:      clinic.id,
      clinicName:    clinic.name,
      qualification,
      turnCount:     newTurnCount,
      collectedData: updatedData,
      channel:       params.channel,
      tone:          config.tone,
      patientName:   (updatedData.name as string | null) ?? null,
      specialties:   config.specialties,
      businessHours: `${config.businessHours.start}:00 AM - ${config.businessHours.end}:00`,
      maxTurns:      config.maxTurns,
      knowledgeBase: config.knowledgeBase,
    }
  )

  await sendAgentReply(params.leadId, response, params.channel, clinic.id)

  // Upsert AgentConversation
  const newStatus = newTurnCount >= config.maxTurns ? 'COMPLETED' as const : 'ACTIVE' as const
  const safeData = JSON.parse(JSON.stringify(updatedData))
  await db.agentConversation.upsert({
    where:  { leadId: params.leadId },
    create: {
      leadId: params.leadId, agentType: 'CAPTADOR', status: newStatus,
      channel: params.channel, turnCount: newTurnCount,
      lastAgentMsgAt: new Date(), collectedData: safeData,
    },
    update: {
      turnCount: newTurnCount, lastAgentMsgAt: new Date(),
      collectedData: safeData, status: newStatus,
    },
  })

  // If last turn — send handoff message and notify
  if (newTurnCount >= config.maxTurns) {
    await sendAgentReply(params.leadId, getHandoffMessage(clinic.name, 'max_turns'), params.channel, clinic.id)
    await handoffToHuman({ leadId: params.leadId, clinicId: clinic.id, reason: 'max_turns', qualification, collectedData: updatedData })
  }
}

// ── Send via the correct channel and persist to DB ───────
export async function sendAgentReply(
  leadId:   string,
  content:  string,
  channel:  MarketingChannel,
  clinicId: string
): Promise<void> {
  let delivered = false

  if (channel === 'WHATSAPP') {
    const lead = await db.lead.findUnique({ where: { id: leadId }, select: { phone: true } })
    delivered = lead?.phone ? await sendWhatsAppMessageForClinic(clinicId, lead.phone, content) : false
  } else {
    const profile = await db.socialProfile.findFirst({
      where: { leadId, channel },
      select: { externalId: true },
    })
    if (profile) {
      const token = await getChannelAccessToken(clinicId, channel)
      if (token) {
        if (channel === 'FACEBOOK') {
          delivered = (await sendMessengerMessage(profile.externalId, content, token)) !== null
        } else if (channel === 'INSTAGRAM') {
          const igChannel = await db.clinicChannel.findUnique({
            where:  { clinicId_channel: { clinicId, channel: 'INSTAGRAM' } },
            select: { pageId: true },
          })
          delivered = igChannel?.pageId
            ? (await sendInstagramMessage(igChannel.pageId, profile.externalId, content, token)) !== null
            : false
        }
      }
    }
  }

  if (!delivered) {
    console.error(`[captador] no se pudo entregar respuesta a lead=${leadId} canal=${channel} — revisa el token/conexión del canal`)
  }

  // Si es el primer mensaje del agente a este lead → Contacto Nuevo → Contactado
  const prevOutbound = await db.message.count({ where: { leadId, direction: 'OUTBOUND' } })
  if (prevOutbound === 0) {
    moveLeadToStageBySlug(leadId, clinicId, 'contactado', 'primer mensaje enviado').catch(console.error)
    // CAPI: Contact event — agent first response establishes contact
    const lead = await db.lead.findUnique({ where: { id: leadId }, select: { phone: true, email: true } })
    if (lead) capiFire_Contact({ phone: lead.phone, email: lead.email })
  }

  // Persist outbound message
  await db.message.create({
    data: {
      leadId,
      direction:   'OUTBOUND',
      content,
      channel,
      status:      delivered ? 'SENT' : 'FAILED',
      isAutomatic: true,
    },
  })
}

// Resetea la conversación del agente si el lead lleva > 30 días inactivo,
// para que el agente empiece desde cero en vez de retomar un hilo obsoleto.
async function resetDormantConversation(leadId: string): Promise<void> {
  const conv = await db.agentConversation.findUnique({
    where:  { leadId },
    select: { id: true, status: true, updatedAt: true },
  })
  if (!conv || conv.status === 'HANDED_OFF' || conv.status === 'COMPLETED') return

  const daysSinceUpdate = (Date.now() - conv.updatedAt.getTime()) / (1000 * 60 * 60 * 24)
  if (daysSinceUpdate < 30) return

  await Promise.all([
    db.agentConversation.update({
      where: { leadId },
      data:  {
        status:            'ACTIVE',
        turnCount:         0,
        currentFlowNodeId: null,
        detectedNeeds:     [],
        objections:        [],
        rapportScore:      0,
      },
    }),
    db.lead.update({
      where: { id: leadId },
      data:  { journeyState: 'PROSPECTO' },
    }),
  ])
  console.log(`[captador] journeyState reseteado para lead=${leadId} (${Math.round(daysSinceUpdate)} días inactivo)`)
}
