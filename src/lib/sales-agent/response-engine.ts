import { db } from '@/lib/db'
import { qualifyMessage } from '@/lib/captador/qualification-engine'
import { handoffToHuman } from '@/lib/captador/handoff'
import { sendAgentReply } from '@/lib/captador/run-cycle'
import { getHandoffMessage } from '@/lib/captador/response-generator'
import { callAI } from '@/lib/ai/client'
import { buildKnowledgeContext } from './knowledge-base'
import { STAGE_INSTRUCTIONS, shouldAdvanceStage, estimateRapportDelta } from './sales-framework'
import { decideResourceToSend, markResourceSent } from './resource-sender'
import type { MarketingChannel } from '@prisma/client'

type Objection = { text: string; resolved: boolean }

export async function generateConsultativeResponse(params: {
  leadId:     string
  clinicId:   string
  clinicName: string
  channel:    MarketingChannel
  message:    string
}): Promise<void> {
  const conv = await db.agentConversation.upsert({
    where:  { leadId: params.leadId },
    create: { leadId: params.leadId, agentType: 'CAPTADOR', channel: params.channel },
    update: {},
  })

  if (conv.status === 'HANDED_OFF') return

  const recentMsgs = await db.message.findMany({
    where:   { leadId: params.leadId },
    orderBy: { sentAt: 'asc' },
    take:    40, // memoria amplia, sin límite de 4 turnos
  })
  const history = recentMsgs.map(m => ({
    role:    m.direction === 'INBOUND' ? 'user' as const : 'assistant' as const,
    content: m.content,
  }))

  const collectedData = (conv.collectedData as Record<string, unknown>) ?? {}
  const needs          = (conv.detectedNeeds as string[]) ?? []
  const objections      = (conv.objections as Objection[]) ?? []

  // 1. Calificar el mensaje (mismo motor del Captador básico, en modo consultivo pide señales extra)
  const qualification = await qualifyMessage({
    message:             params.message,
    conversationHistory: history.slice(-6),
    clinicName:          params.clinicName,
    clinicId:            params.clinicId,
    collectedSoFar:      { ...collectedData, objections },
    consultiveMode:      true,
  })

  // 2. Hand-off inmediato por urgencia/queja — reusa el flujo ya existente
  if (qualification.shouldHandOff) {
    const reason = qualification.intent === 'urgencia_dental' ? 'urgencia' : 'queja'
    await db.agentConversation.update({ where: { leadId: params.leadId }, data: { salesStage: 'LISTO_PARA_HUMANO' } })
    await sendAgentReply(params.leadId, getHandoffMessage(params.clinicName, reason), params.channel, params.clinicId)
    await handoffToHuman({ leadId: params.leadId, clinicId: params.clinicId, reason, qualification, collectedData })
    return
  }

  if (!qualification.shouldRespond) return

  // 3. Actualizar memoria del prospecto (needs/objections/estado emocional)
  const updatedNeeds = qualification.detectedNeed && !needs.includes(qualification.detectedNeed)
    ? [...needs, qualification.detectedNeed]
    : needs

  let updatedObjections = objections
  if (qualification.newObjection) {
    updatedObjections = [...updatedObjections, { text: qualification.newObjection, resolved: false }]
  }
  if (qualification.resolvedObjection) {
    updatedObjections = updatedObjections.map(o =>
      o.text === qualification.resolvedObjection ? { ...o, resolved: true } : o,
    )
  }

  const updatedCollectedData: Record<string, unknown> = {
    ...collectedData,
    ...(qualification.extractedName     && { name:      qualification.extractedName }),
    ...(qualification.extractedBudget   && { budget:    qualification.extractedBudget }),
    ...(qualification.extractedBestTime && { bestTime:  qualification.extractedBestTime }),
    ...(qualification.treatment         && { treatment: qualification.treatment }),
    urgency: qualification.urgency,
  }

  const objectionsUnresolved = updatedObjections.filter(o => !o.resolved).length
  const newRapport = Math.min(100, conv.rapportScore + estimateRapportDelta(qualification.sentiment))

  const nextStage = shouldAdvanceStage({
    current:              conv.salesStage,
    rapportScore:         newRapport,
    needsCount:           updatedNeeds.length,
    objectionsUnresolved,
    shouldHandOff:        false,
  })

  // 4. Si avanzó a "listo para humano" por el framework (no por urgencia) — handoff suave
  if (nextStage === 'LISTO_PARA_HUMANO') {
    await db.agentConversation.update({
      where: { leadId: params.leadId },
      data: {
        detectedNeeds: updatedNeeds, objections: updatedObjections, rapportScore: newRapport,
        salesStage: nextStage, emotionalState: qualification.emotionalState,
        collectedData: JSON.parse(JSON.stringify(updatedCollectedData)),
      },
    })
    await sendAgentReply(
      params.leadId,
      '¡Qué bueno hablar contigo! Voy a conectarte con nuestro equipo para el siguiente paso. En un momento te escriben. 😊',
      params.channel,
      params.clinicId,
    )
    await handoffToHuman({ leadId: params.leadId, clinicId: params.clinicId, reason: 'listo_para_cierre', qualification, collectedData: updatedCollectedData })
    return
  }

  // 5. Buscar contexto relevante en la base de conocimiento (RAG)
  const knowledgeContext = await buildKnowledgeContext(params.clinicId, params.message)

  // 6. Generar la respuesta consultiva
  const historyText = history.map(m => `${m.role === 'user' ? 'Prospecto' : 'Agente'}: ${m.content}`).join('\n')

  const aiResult = await callAI({
    agentKey:    'SALES_AGENT_RESPONDER',
    clinicId:    params.clinicId,
    systemPrompt: `Eres el asistente de ventas consultivo de ${params.clinicName}.
${STAGE_INSTRUCTIONS[nextStage]}

PERFIL DEL PROSPECTO HASTA AHORA:
- Necesidades detectadas: ${JSON.stringify(updatedNeeds)}
- Estado emocional: ${qualification.emotionalState ?? 'desconocido'}
- Objeciones sin resolver: ${objectionsUnresolved}
${knowledgeContext}

REGLAS:
- Mensajes cortos, máximo 3 oraciones, español natural sin sonar a guion.
- Refleja el tono del prospecto (formal/informal, uso de emojis).
- Nunca menciones que eres una IA a menos que te lo pregunten directo.
- Nunca inventes información que no esté en el contexto de la base de conocimiento.
- Nunca uses presión, urgencia falsa, ni prometas algo que no está confirmado.`,
    userPrompt: `Historial reciente:\n${historyText}\n\nMensaje actual: ${params.message}`,
  })

  const responseText = aiResult.success ? aiResult.data : '¡Cuéntame más! 😊'

  await sendAgentReply(params.leadId, responseText, params.channel, params.clinicId)

  // 7. Persistir el nuevo estado de la conversación
  await db.agentConversation.update({
    where: { leadId: params.leadId },
    data: {
      turnCount:      conv.turnCount + 1,
      lastAgentMsgAt: new Date(),
      detectedNeeds:  updatedNeeds,
      objections:     updatedObjections,
      rapportScore:   newRapport,
      salesStage:      nextStage,
      emotionalState: qualification.emotionalState,
      collectedData:  JSON.parse(JSON.stringify(updatedCollectedData)),
    },
  })

  // 8. Decidir si corresponde enviar algún recurso (link/video)
  const resourcesSent = (conv.resourcesSent as string[]) ?? []
  const resource = decideResourceToSend({ stage: nextStage, resourcesSent })
  if (resource) {
    await sendAgentReply(params.leadId, resource.url, params.channel, params.clinicId)
    await markResourceSent(params.leadId, resource.type)
  }
}
