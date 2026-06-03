import { db } from '@/lib/db'
import type { MarketingChannel, InboxStatus } from '@prisma/client'

export type InboxConversationItem = {
  id: string
  leadId: string
  channel: MarketingChannel
  status: InboxStatus
  isRead: boolean
  isPinned: boolean
  unreadCount: number
  assignedToId: string | null
  lastMessageAt: Date | null
  lastMessagePreview: string | null
  createdAt: Date
  updatedAt: Date
  clinicId: string
  lead: {
    fullName: string
    phone: string
    treatment: string | null
    stage: { name: string; color: string } | null
  }
  assignedTo: { id: string; name: string; avatarUrl: string | null } | null
  labels: { id: string; name: string; color: string; emoji: string | null }[]
}

export type InboxFilters = {
  status?: InboxStatus
  channel?: MarketingChannel
  isRead?: boolean
  labelId?: string
  search?: string
  assignedToId?: string
}

export async function getInboxConversations(
  clinicId: string,
  filters: InboxFilters = {},
  page = 1,
  limit = 30
): Promise<{ conversations: InboxConversationItem[]; total: number }> {
  const where = {
    clinicId,
    ...(filters.status    !== undefined && { status:  filters.status }),
    ...(filters.channel   !== undefined && { channel: filters.channel }),
    ...(filters.isRead    !== undefined && { isRead:  filters.isRead }),
    ...(filters.assignedToId            && { assignedToId: filters.assignedToId }),
    ...(filters.labelId                 && { labels: { some: { labelId: filters.labelId } } }),
    ...(filters.search                  && {
      lead: {
        OR: [
          { fullName: { contains: filters.search, mode: 'insensitive' as const } },
          { phone:    { contains: filters.search } },
        ],
      },
    }),
  }

  const [raw, total] = await Promise.all([
    db.inboxConversation.findMany({
      where,
      orderBy: [{ isPinned: 'desc' }, { lastMessageAt: 'desc' }],
      skip:    (page - 1) * limit,
      take:    limit,
      include: {
        lead: {
          select: {
            fullName:  true,
            phone:     true,
            treatment: true,
            stage:     { select: { name: true, color: true } },
          },
        },
        assignedTo: { select: { id: true, name: true, avatarUrl: true } },
        labels: {
          include: { label: { select: { id: true, name: true, color: true, emoji: true } } },
        },
      },
    }),
    db.inboxConversation.count({ where }),
  ])

  return {
    conversations: raw.map(c => ({ ...c, labels: c.labels.map(cl => cl.label) })),
    total,
  }
}

export async function getConversationDetail(
  conversationId: string,
  clinicId: string
) {
  const conv = await db.inboxConversation.findFirst({
    where: { id: conversationId, clinicId },
    include: {
      lead: { select: { id: true, fullName: true, phone: true, treatment: true } },
      assignedTo: { select: { id: true, name: true, avatarUrl: true } },
      labels: { include: { label: { select: { id: true, name: true, color: true, emoji: true } } } },
    },
  })
  if (!conv) return null

  const messages = await db.message.findMany({
    where:   { leadId: conv.leadId, channel: conv.channel },
    orderBy: { sentAt: 'asc' },
    take:    100,
  })

  await db.inboxConversation.update({
    where: { id: conversationId },
    data:  { isRead: true, unreadCount: 0 },
  })

  return { conversation: { ...conv, labels: conv.labels.map(cl => cl.label) }, messages }
}

export async function getInboxCounts(clinicId: string) {
  const [total, unread, byChannel] = await Promise.all([
    db.inboxConversation.count({ where: { clinicId, status: 'OPEN' } }),
    db.inboxConversation.count({ where: { clinicId, isRead: false } }),
    db.inboxConversation.groupBy({
      by:    ['channel'],
      where: { clinicId, status: 'OPEN' },
      _count: { id: true },
    }),
  ])

  const channels: Record<string, number> = {}
  for (const item of byChannel) channels[item.channel] = item._count.id

  return { total, unread, channels }
}

export async function getClinicLabels(clinicId: string) {
  return db.inboxLabel.findMany({ where: { clinicId }, orderBy: { createdAt: 'asc' } })
}

export async function upsertInboxConversation(params: {
  clinicId:  string
  leadId:    string
  channel:   MarketingChannel
  preview:   string
  isInbound: boolean
}): Promise<string> {
  const preview = params.preview.slice(0, 200)

  const conv = await db.inboxConversation.upsert({
    where:  { leadId_channel: { leadId: params.leadId, channel: params.channel } },
    create: {
      clinicId:           params.clinicId,
      leadId:             params.leadId,
      channel:            params.channel,
      status:             'OPEN',
      isRead:             !params.isInbound,
      unreadCount:        params.isInbound ? 1 : 0,
      lastMessageAt:      new Date(),
      lastMessagePreview: preview,
    },
    update: params.isInbound
      ? { status: 'OPEN', isRead: false, unreadCount: { increment: 1 }, lastMessageAt: new Date(), lastMessagePreview: preview }
      : { status: 'OPEN', lastMessageAt: new Date(), lastMessagePreview: preview },
  })

  return conv.id
}
