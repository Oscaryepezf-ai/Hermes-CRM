"use server"

import { z } from "zod"
import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { requirePermission, unauthorizedResponse } from "@/lib/rbac/guards"
import {
  getInboxConversations, getConversationDetail,
  getInboxCounts, getClinicLabels, upsertInboxConversation,
} from "@/lib/inbox/conversations"
import type { InboxFilters } from "@/lib/inbox/conversations"
import type { InboxStatus } from "@prisma/client"
import { sendWhatsAppTextMessage } from "@/lib/whatsapp/client"

// ── Obtener conversaciones ────────────────────────────────
export async function fetchConversations(filters: InboxFilters = {}, page = 1) {
  const guard = await requirePermission('inbox', 'view')
  if (!guard.authorized) return unauthorizedResponse(guard.error)

  const result = await getInboxConversations(guard.user.clinicId, filters, page)
  return { success: true as const, ...result }
}

// ── Obtener mensajes de una conversación ──────────────────
export async function fetchConversationDetail(conversationId: string) {
  const guard = await requirePermission('inbox', 'view')
  if (!guard.authorized) return unauthorizedResponse(guard.error)

  const result = await getConversationDetail(conversationId, guard.user.clinicId)
  if (!result) return { success: false as const, error: 'Conversación no encontrada' }

  return { success: true as const, ...result }
}

// ── Responder o crear nota ────────────────────────────────
const ReplySchema = z.object({
  conversationId: z.string().cuid(),
  content:        z.string().min(1).max(4096),
  type:           z.enum(['reply', 'note']),
})

export async function replyToConversation(data: z.infer<typeof ReplySchema>) {
  const guard = await requirePermission('inbox', 'edit')
  if (!guard.authorized) return unauthorizedResponse(guard.error)

  const parsed = ReplySchema.safeParse(data)
  if (!parsed.success) return { success: false as const, error: 'Datos inválidos' }

  const conv = await db.inboxConversation.findFirst({
    where:   { id: data.conversationId, clinicId: guard.user.clinicId },
    include: { lead: { select: { phone: true } } },
  })
  if (!conv) return { success: false as const, error: 'Conversación no encontrada' }

  const isNote = data.type === 'note'

  await db.message.create({
    data: {
      leadId:    conv.leadId,
      direction: 'OUTBOUND',
      content:   data.content,
      channel:   conv.channel,
      status:    'SENT',
      isNote,
    },
  })

  if (!isNote) {
    await db.inboxConversation.update({
      where: { id: conv.id },
      data:  {
        status:             'PENDING',
        lastMessageAt:      new Date(),
        lastMessagePreview: data.content.slice(0, 200),
        isRead:             true,
        unreadCount:        0,
      },
    })

    if (conv.channel === 'WHATSAPP') {
      sendWhatsAppTextMessage(conv.lead.phone, data.content).catch(console.error)
    }
  }

  revalidatePath('/inbox')
  return { success: true as const }
}

// ── Asignar conversación ──────────────────────────────────
export async function assignConversation(conversationId: string, userId: string | null) {
  const guard = await requirePermission('inbox', 'edit')
  if (!guard.authorized) return unauthorizedResponse(guard.error)

  await db.inboxConversation.updateMany({
    where: { id: conversationId, clinicId: guard.user.clinicId },
    data:  { assignedToId: userId },
  })

  revalidatePath('/inbox')
  return { success: true as const }
}

// ── Cambiar estado ────────────────────────────────────────
export async function updateConversationStatus(
  conversationId: string,
  status: InboxStatus
) {
  const guard = await requirePermission('inbox', 'edit')
  if (!guard.authorized) return unauthorizedResponse(guard.error)

  await db.inboxConversation.updateMany({
    where: { id: conversationId, clinicId: guard.user.clinicId },
    data:  { status },
  })

  revalidatePath('/inbox')
  return { success: true as const }
}

// ── Etiquetar conversación ────────────────────────────────
export async function addLabelToConversation(conversationId: string, labelId: string) {
  const guard = await requirePermission('inbox', 'edit')
  if (!guard.authorized) return unauthorizedResponse(guard.error)

  // Verify the label belongs to the clinic
  const label = await db.inboxLabel.findFirst({
    where: { id: labelId, clinicId: guard.user.clinicId },
  })
  if (!label) return { success: false as const, error: 'Etiqueta no encontrada' }

  await db.inboxConversationLabel.upsert({
    where:  { conversationId_labelId: { conversationId, labelId } },
    create: { conversationId, labelId },
    update: {},
  })

  revalidatePath('/inbox')
  return { success: true as const }
}

export async function removeLabelFromConversation(conversationId: string, labelId: string) {
  const guard = await requirePermission('inbox', 'edit')
  if (!guard.authorized) return unauthorizedResponse(guard.error)

  await db.inboxConversationLabel.deleteMany({
    where: { conversationId, labelId },
  })

  revalidatePath('/inbox')
  return { success: true as const }
}

// ── Obtener contadores para el sidebar ────────────────────
export async function fetchInboxCounts() {
  const guard = await requirePermission('inbox', 'view')
  if (!guard.authorized) return unauthorizedResponse(guard.error)

  const counts = await getInboxCounts(guard.user.clinicId)
  return { success: true as const, data: counts }
}

// ── Obtener etiquetas de la clínica ───────────────────────
export async function fetchClinicLabels() {
  const guard = await requirePermission('inbox', 'view')
  if (!guard.authorized) return unauthorizedResponse(guard.error)

  const labels = await getClinicLabels(guard.user.clinicId)
  return { success: true as const, data: labels }
}

// ── Crear etiqueta ────────────────────────────────────────
const LabelSchema = z.object({
  name:  z.string().min(1).max(30),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  emoji: z.string().max(4).optional(),
})

export async function createInboxLabel(params: z.infer<typeof LabelSchema>) {
  const guard = await requirePermission('inbox', 'edit')
  if (!guard.authorized) return unauthorizedResponse(guard.error)

  const parsed = LabelSchema.safeParse(params)
  if (!parsed.success) return { success: false as const, error: 'Datos inválidos' }

  const label = await db.inboxLabel.create({
    data: {
      clinicId: guard.user.clinicId,
      name:     parsed.data.name,
      color:    parsed.data.color,
      emoji:    parsed.data.emoji,
    },
  })

  revalidatePath('/inbox')
  return { success: true as const, data: label }
}

// ── Obtener usuarios de la clínica (para asignar) ─────────
export async function fetchClinicUsers() {
  const guard = await requirePermission('inbox', 'view')
  if (!guard.authorized) return unauthorizedResponse(guard.error)

  const users = await db.user.findMany({
    where:  { clinicId: guard.user.clinicId, isActive: true },
    select: { id: true, name: true, avatarUrl: true, role: true },
    orderBy: { name: 'asc' },
  })

  return { success: true as const, data: users }
}

export { upsertInboxConversation }
