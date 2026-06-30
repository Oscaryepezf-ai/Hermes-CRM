import { NextRequest, NextResponse } from 'next/server'
import { auth } from '../../../../../auth'
import { db } from '@/lib/db'
import { qualifyMessage } from '@/lib/captador/qualification-engine'
import {
  generateCaptadorResponse,
  getHandoffMessage,
  getOutOfHoursMessage,
} from '@/lib/captador/response-generator'
import { handoffToHuman } from '@/lib/captador/handoff'
import type { CaptadorConfig } from '@/lib/captador/conversation-router'

function parseConfig(raw: unknown): CaptadorConfig {
  const c = (raw ?? {}) as Record<string, unknown>
  return {
    businessHours: {
      start: (c.businessHours as { start?: number })?.start ?? 8,
      end:   (c.businessHours as { end?: number })?.end   ?? 20,
    },
    maxTurns:      (c.maxTurns    as number | undefined) ?? 4,
    tone:          (c.tone        as 'formal' | 'amigable' | undefined) ?? 'amigable',
    specialties:   (c.specialties as string[] | undefined) ?? ['Ortodoncia', 'Implantes', 'Blanqueamiento'],
    knowledgeBase: (c.knowledgeBase as string | undefined) ?? '',
    mode:          (c.mode as 'basico' | 'consultivo' | 'flujo' | undefined) ?? 'basico',
    flowId:        (c.flowId as string | undefined) ?? null,
  }
}

function getEcuadorHour(): number {
  const dateStr = new Date().toLocaleString('en-US', { timeZone: 'America/Guayaquil' })
  return new Date(dateStr).getHours()
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.clinicId) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }
  if (!['ADMIN', 'OWNER'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Solo administradores' }, { status: 403 })
  }

  const { message, sessionId } = await req.json() as { message: string; sessionId: string }
  if (!message?.trim() || !sessionId) {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
  }

  const clinicId = session.user.clinicId
  const simPhone = `SIM-${sessionId}`

  const clinic = await db.clinic.findUnique({
    where:  { id: clinicId },
    select: { name: true, captadorConfig: true },
  })
  if (!clinic) return NextResponse.json({ error: 'Clínica no encontrada' }, { status: 404 })

  const config = parseConfig(clinic.captadorConfig)

  // Upsert simulation lead
  let lead = await db.lead.findFirst({ where: { phone: simPhone, clinicId } })
  if (!lead) {
    const firstStage = await db.pipelineStage.findFirst({ where: { clinicId }, orderBy: { order: 'asc' } })
    lead = await db.lead.create({
      data: {
        fullName:     'Prospecto de prueba',
        phone:        simPhone,
        source:       'WHATSAPP',
        channel:      'WHATSAPP',
        clinicId,
        stageId:      firstStage?.id,
        journeyState: 'PROSPECTO',
        notes:        '[SIMULACIÓN — borrar después de la prueba]',
      },
    })
  }

  // Persist inbound message
  await db.message.create({
    data: { leadId: lead.id, direction: 'INBOUND', content: message, channel: 'WHATSAPP', status: 'SENT' },
  })

  const conv = await db.agentConversation.findUnique({ where: { leadId: lead.id } })
  if (conv?.status === 'HANDED_OFF') {
    return NextResponse.json({
      reply:        '— El prospecto ya fue transferido a un humano en esta sesión. Reinicia la simulación para empezar de nuevo. —',
      leadId:       lead.id,
      stageName:    null,
      journeyState: 'CALIFICADO',
      handed_off:   true,
    })
  }

  // Load conversation history for the AI
  const recentMessages = await db.message.findMany({
    where:   { leadId: lead.id },
    orderBy: { sentAt: 'asc' },
    take:    20,
  })
  const history = recentMessages.slice(0, -1).map(m => ({
    role:    m.direction === 'INBOUND' ? 'user' as const : 'assistant' as const,
    content: m.content,
  }))

  const collectedData = (conv?.collectedData ?? {}) as Record<string, unknown>
  const turnCount = conv?.turnCount ?? 0

  // Qualify the message
  const qualification = await qualifyMessage({
    message,
    conversationHistory: history,
    clinicName:          clinic.name,
    clinicId,
    collectedSoFar:      collectedData,
  })

  const updatedData: Record<string, unknown> = {
    ...collectedData,
    ...(qualification.extractedName     && { name:      qualification.extractedName }),
    ...(qualification.extractedBudget   && { budget:    qualification.extractedBudget }),
    ...(qualification.extractedBestTime && { bestTime:  qualification.extractedBestTime }),
    ...(qualification.treatment         && { treatment: qualification.treatment }),
    urgency: qualification.urgency,
  }

  // Handoff?
  if (qualification.shouldHandOff) {
    const reason = qualification.intent === 'urgencia_dental' ? 'urgencia' : 'queja'
    const replyText = getHandoffMessage(clinic.name, reason)

    await db.message.create({
      data: { leadId: lead.id, direction: 'OUTBOUND', content: replyText, channel: 'WHATSAPP', status: 'SENT', isAutomatic: true },
    })

    await handoffToHuman({ leadId: lead.id, clinicId, reason, qualification, collectedData: updatedData })

    const updatedLead = await db.lead.findUnique({ where: { id: lead.id }, include: { stage: true } })
    return NextResponse.json({
      reply:        replyText,
      leadId:       lead.id,
      stageName:    updatedLead?.stage?.name ?? null,
      journeyState: updatedLead?.journeyState,
      qualification,
      handed_off:   true,
    })
  }

  // Out-of-hours (solo en primer turno)
  const hour = getEcuadorHour()
  const isBusinessHours = hour >= config.businessHours.start && hour < config.businessHours.end
  if (!isBusinessHours && turnCount === 0) {
    const hours = `${config.businessHours.start}:00 a ${config.businessHours.end}:00`
    const replyText = getOutOfHoursMessage(clinic.name, hours)
    await db.message.create({
      data: { leadId: lead.id, direction: 'OUTBOUND', content: replyText, channel: 'WHATSAPP', status: 'SENT', isAutomatic: true },
    })
    const updatedLead = await db.lead.findUnique({ where: { id: lead.id }, include: { stage: true } })
    return NextResponse.json({ reply: replyText, leadId: lead.id, stageName: updatedLead?.stage?.name ?? null, journeyState: updatedLead?.journeyState, qualification, handed_off: false })
  }

  // Generate response
  const newTurnCount = turnCount + 1
  const responseText = await generateCaptadorResponse(
    [...history, { role: 'user', content: message }],
    {
      clinicId,
      clinicName:    clinic.name,
      qualification,
      turnCount:     newTurnCount,
      collectedData: updatedData,
      channel:       'WhatsApp',
      tone:          config.tone,
      patientName:   (updatedData.name as string | undefined) ?? null,
      specialties:   config.specialties,
      businessHours: `${config.businessHours.start}:00 a ${config.businessHours.end}:00`,
      maxTurns:      config.maxTurns,
      knowledgeBase: config.knowledgeBase,
    }
  )

  // Persist outbound message — trigger "Contactado" stage move via sendAgentReply detection
  const prevOutbound = await db.message.count({ where: { leadId: lead.id, direction: 'OUTBOUND' } })

  await db.message.create({
    data: { leadId: lead.id, direction: 'OUTBOUND', content: responseText, channel: 'WHATSAPP', status: 'SENT', isAutomatic: true },
  })

  // Move stage to Contactado on first reply
  if (prevOutbound === 0) {
    const { moveLeadToStageBySlug } = await import('@/lib/pipeline/auto-stage-sync')
    await moveLeadToStageBySlug(lead.id, clinicId, 'contactado', 'primer mensaje (simulación)')
      .catch(console.error)
    // For simulation, also bypass captadorActive gate manually if it was false
    const targetStage = await db.pipelineStage.findFirst({ where: { clinicId, slug: 'contactado' } })
    if (targetStage) {
      const currentLead = await db.lead.findUnique({ where: { id: lead.id }, select: { stageId: true, stage: { select: { order: true, name: true } } } })
      if (currentLead?.stage && currentLead.stage.order < targetStage.order) {
        await db.lead.update({ where: { id: lead.id }, data: { stageId: targetStage.id } })
      }
    }
  }

  // Update conversation
  const newStatus = newTurnCount >= config.maxTurns ? 'COMPLETED' as const : 'ACTIVE' as const
  await db.agentConversation.upsert({
    where:  { leadId: lead.id },
    create: { leadId: lead.id, agentType: 'CAPTADOR', status: newStatus, channel: 'WHATSAPP', turnCount: newTurnCount, lastAgentMsgAt: new Date(), collectedData: JSON.parse(JSON.stringify(updatedData)) },
    update: { turnCount: newTurnCount, lastAgentMsgAt: new Date(), collectedData: JSON.parse(JSON.stringify(updatedData)), status: newStatus },
  })

  // Max turns handoff
  if (newTurnCount >= config.maxTurns) {
    const handoffText = getHandoffMessage(clinic.name, 'max_turns')
    await db.message.create({
      data: { leadId: lead.id, direction: 'OUTBOUND', content: handoffText, channel: 'WHATSAPP', status: 'SENT', isAutomatic: true },
    })
    await handoffToHuman({ leadId: lead.id, clinicId, reason: 'max_turns', qualification, collectedData: updatedData })
  }

  const updatedLead = await db.lead.findUnique({ where: { id: lead.id }, include: { stage: true } })

  return NextResponse.json({
    reply:        responseText,
    leadId:       lead.id,
    stageName:    updatedLead?.stage?.name ?? null,
    journeyState: updatedLead?.journeyState,
    qualification,
    handed_off:   newTurnCount >= config.maxTurns,
    turnsLeft:    Math.max(0, config.maxTurns - newTurnCount),
  })
}
