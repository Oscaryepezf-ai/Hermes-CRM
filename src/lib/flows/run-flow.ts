import { db } from '@/lib/db'
import { sendAgentReply } from '@/lib/captador/run-cycle'
import { handoffToHuman } from '@/lib/captador/handoff'
import { getWhatsAppCredentials, sendWhatsAppInteractiveMessage } from '@/lib/whatsapp/client'
import type { QualificationResult } from '@/lib/captador/qualification-engine'
import type { MarketingChannel, FlowNode } from '@prisma/client'
import type { FlowButton } from './types'

// El Constructor de Flujos no califica con IA — se usa un resultado fijo
// solo para satisfacer la firma de handoffToHuman() (reusa el flujo existente).
const FLOW_QUALIFICATION: QualificationResult = {
  intent: 'agendar_cita', treatment: null, urgency: 'media', sentiment: 'neutro',
  extractedName: null, extractedBudget: null, extractedBestTime: null,
  shouldRespond: true, shouldHandOff: true, confidence: 1,
  detectedNeed: null, newObjection: null, resolvedObjection: null, emotionalState: null,
}

export async function runFlowCycle(params: {
  leadId:    string
  clinicId:  string
  flowId:    string | null
  buttonId?: string
  channel:   MarketingChannel
}): Promise<void> {
  if (!params.flowId) return

  const conv = await db.agentConversation.upsert({
    where:  { leadId: params.leadId },
    create: { leadId: params.leadId, agentType: 'CAPTADOR', channel: params.channel },
    update: {},
  })
  if (conv.status === 'HANDED_OFF') return

  let targetNodeId: string | null = null

  if (conv.currentFlowNodeId) {
    if (params.buttonId) {
      const currentNode = await db.flowNode.findUnique({ where: { id: conv.currentFlowNodeId } })
      const buttons = (currentNode?.buttons as unknown as FlowButton[]) ?? []
      const button  = buttons.find(b => b.id === params.buttonId)
      targetNodeId  = button ? button.nextNodeId : conv.currentFlowNodeId
    } else {
      // Mensaje de texto libre en vez de tocar un botón — reenvía el nodo actual.
      targetNodeId = conv.currentFlowNodeId
    }
  } else {
    const flow = await db.flow.findUnique({ where: { id: params.flowId } })
    targetNodeId = flow?.startNodeId ?? null
  }

  if (!targetNodeId) return
  const node = await db.flowNode.findUnique({ where: { id: targetNodeId } })
  if (!node) return

  if (node.type === 'HANDOFF') {
    await sendAgentReply(params.leadId, node.text, params.channel, params.clinicId)
    await handoffToHuman({
      leadId: params.leadId, clinicId: params.clinicId, reason: 'flujo',
      qualification: FLOW_QUALIFICATION, collectedData: {},
    })
    await db.agentConversation.update({ where: { leadId: params.leadId }, data: { currentFlowNodeId: null } })
    return
  }

  const buttons = (node.buttons as unknown as FlowButton[]) ?? []

  if (node.type === 'END' || buttons.length === 0) {
    await sendAgentReply(params.leadId, node.text, params.channel, params.clinicId)
    await db.agentConversation.update({
      where: { leadId: params.leadId },
      data:  { currentFlowNodeId: null, status: 'COMPLETED' },
    })
    return
  }

  await sendFlowMessageNode(params.leadId, params.clinicId, params.channel, node, buttons)
  await db.agentConversation.update({ where: { leadId: params.leadId }, data: { currentFlowNodeId: node.id } })
}

async function sendFlowMessageNode(
  leadId:   string,
  clinicId: string,
  channel:  MarketingChannel,
  node:     FlowNode,
  buttons:  FlowButton[],
): Promise<void> {
  const readableContent = `${node.text}\n${buttons.map(b => `• ${b.label}`).join('\n')}`
  let delivered = false

  if (channel === 'WHATSAPP') {
    const [lead, creds] = await Promise.all([
      db.lead.findUnique({ where: { id: leadId }, select: { phone: true } }),
      getWhatsAppCredentials(clinicId),
    ])
    if (lead?.phone && creds) {
      delivered = await sendWhatsAppInteractiveMessage(lead.phone, {
        bodyText:  node.text,
        mediaUrl:  node.mediaUrl,
        mediaType: node.mediaType as 'image' | 'video' | 'document' | null,
        buttons:   buttons.map(b => ({ id: b.id, title: b.label })),
      }, creds)
    }
  }
  // El Constructor de Flujos depende de botones interactivos — solo WhatsApp
  // los soporta en este momento (Messenger/Instagram quedan fuera de alcance v1).

  await db.message.create({
    data: {
      leadId, direction: 'OUTBOUND', content: readableContent, mediaUrl: node.mediaUrl,
      channel, status: delivered ? 'SENT' : 'FAILED', isAutomatic: true,
    },
  })
}
