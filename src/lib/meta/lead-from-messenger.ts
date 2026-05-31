import { db } from '@/lib/db'
import { getMessengerUserProfile } from './messenger-client'
import { getInstagramUserProfile } from './instagram-client'
import type { ParsedMessengerEvent } from './parse-messenger-event'
import type { MarketingChannel } from '@prisma/client'

// ── Find clinic by Facebook Page ID ──────────────────────
export async function getClinicByPageId(pageId: string) {
  // First try the Clinic.facebookPageId field (legacy)
  const byClinic = await db.clinic.findFirst({
    where: { facebookPageId: pageId, messengerActive: true },
  })
  if (byClinic) return byClinic

  // Then try ClinicChannel (used after OAuth flow)
  const byChannel = await db.clinicChannel.findFirst({
    where:   { pageId, channel: 'FACEBOOK', isActive: true },
    include: { clinic: true },
  })
  return byChannel?.clinic ?? null
}

// ── Find clinic by Instagram Business Account ID ──────────
export async function getClinicByIgAccountId(igBusinessId: string) {
  const channel = await db.clinicChannel.findFirst({
    where:   { pageId: igBusinessId, channel: 'INSTAGRAM', isActive: true },
    include: { clinic: true },
  })
  return channel ? { clinic: channel.clinic, accessToken: channel.accessToken } : null
}

// ── Get channel access token from DB ─────────────────────
export async function getChannelAccessToken(
  clinicId: string,
  channel:  MarketingChannel
): Promise<string | null> {
  const record = await db.clinicChannel.findUnique({
    where:  { clinicId_channel: { clinicId, channel } },
    select: { accessToken: true, isActive: true },
  })
  return record?.isActive ? (record.accessToken ?? null) : null
}

// ── Process Messenger (Facebook) message ──────────────────
export async function processMessengerMessage(
  event:           ParsedMessengerEvent,
  pageAccessToken: string,
  clinicId:        string
): Promise<{ leadId: string; isNew: boolean }> {
  return processChannelMessage({
    event, accessToken: pageAccessToken, clinicId,
    channel:      'FACEBOOK',
    phoneLabel:   'Facebook Messenger',
    sourceLabel:  'FACEBOOK',
    profileFetch: (id, token) => getMessengerUserProfile(id, token)
      .then(p => p ? { name: p.name, pic: p.profilePic, locale: p.locale, timezone: p.timezone } : null),
    fallbackName: (id) => `Messenger (${id.slice(-6)})`,
    journeyNote:  'Lead creado automáticamente desde Facebook Messenger',
    journeyMeta:  (id) => ({ source: 'facebook_messenger', psid: id }),
  })
}

// ── Process Instagram DM ──────────────────────────────────
export async function processInstagramMessage(
  event:           ParsedMessengerEvent,
  pageAccessToken: string,
  clinicId:        string
): Promise<{ leadId: string; isNew: boolean }> {
  return processChannelMessage({
    event, accessToken: pageAccessToken, clinicId,
    channel:      'INSTAGRAM',
    phoneLabel:   'Instagram DM',
    sourceLabel:  'INSTAGRAM',
    profileFetch: (id, token) => getInstagramUserProfile(id, token)
      .then(p => p ? { name: p.name, pic: p.profilePic, locale: 'es_CO', timezone: -5 } : null),
    fallbackName: (id) => `Instagram (${id.slice(-6)})`,
    journeyNote:  'Lead creado automáticamente desde Instagram DM',
    journeyMeta:  (id) => ({ source: 'instagram_dm', igsid: id }),
  })
}

// ── Generic channel message processor ────────────────────

type ProfileFetch = (id: string, token: string) => Promise<{
  name: string; pic: string; locale: string; timezone: number
} | null>

async function processChannelMessage(params: {
  event:        ParsedMessengerEvent
  accessToken:  string
  clinicId:     string
  channel:      MarketingChannel
  phoneLabel:   string
  sourceLabel:  MarketingChannel
  profileFetch: ProfileFetch
  fallbackName: (id: string) => string
  journeyNote:  string
  journeyMeta:  (id: string) => Record<string, unknown>
}): Promise<{ leadId: string; isNew: boolean }> {
  const { event, accessToken, clinicId, channel } = params
  const userId = event.senderId

  // Check for existing lead
  const existing = await db.socialProfile.findUnique({
    where:  { channel_externalId: { channel, externalId: userId } },
    select: { leadId: true },
  })

  if (existing) {
    await saveInboundMessage(existing.leadId, event, channel)
    await db.lead.update({
      where: { id: existing.leadId },
      data:  { lastContactAt: new Date(), lastActivityAt: new Date(), totalTouchpoints: { increment: 1 } },
    })
    return { leadId: existing.leadId, isNew: false }
  }

  // New lead
  const profile = await params.profileFetch(userId, accessToken)
  const name    = profile?.name ?? params.fallbackName(userId)

  const firstStage = await db.pipelineStage.findFirst({
    where: { clinicId }, orderBy: { order: 'asc' },
  })
  if (!firstStage) throw new Error(`No pipeline stages for clinic ${clinicId}`)

  const lead = await db.$transaction(async (tx) => {
    const newLead = await tx.lead.create({
      data: {
        clinicId,
        fullName:       name,
        phone:          params.phoneLabel,
        source:         params.sourceLabel,
        channel:        params.sourceLabel,
        status:         'NUEVO',
        journeyState:   'PROSPECTO',
        stageId:        firstStage.id,
        lastContactAt:  new Date(),
        lastActivityAt: new Date(),
      },
    })

    await tx.socialProfile.create({
      data: {
        leadId:        newLead.id,
        channel,
        externalId:    userId,
        displayName:   name,
        profilePicUrl: profile?.pic,
        locale:        profile?.locale,
        timezone:      profile?.timezone,
        rawProfile:    profile ? JSON.parse(JSON.stringify(profile)) : undefined,
      },
    })

    if (event.message?.text) {
      await tx.message.create({
        data: {
          leadId:            newLead.id,
          direction:         'INBOUND',
          content:           event.message.text,
          channel,
          externalMessageId: event.message.mid,
          status:            'READ',
          sentAt:            new Date(event.timestamp),
        },
      })
    }

    await tx.journeyEvent.create({
      data: {
        leadId:      newLead.id,
        type:        'MESSAGE_RECEIVED',
        toState:     'PROSPECTO',
        isAutomatic: true,
        metadata:    JSON.parse(JSON.stringify(params.journeyMeta(userId))),
        note:        params.journeyNote,
      },
    })

    return newLead
  })

  return { leadId: lead.id, isNew: true }
}

// ── Save inbound message (dedup by externalMessageId) ────
async function saveInboundMessage(
  leadId:  string,
  event:   ParsedMessengerEvent,
  channel: MarketingChannel
): Promise<void> {
  if (!event.message?.text && !event.message?.attachments) return

  if (event.message?.mid) {
    const exists = await db.message.findFirst({ where: { externalMessageId: event.message.mid } })
    if (exists) return
  }

  const content = event.message?.text ?? `[${event.message?.attachments?.[0]?.type ?? 'archivo'}]`

  await db.message.create({
    data: {
      leadId,
      direction:         'INBOUND',
      content,
      channel,
      externalMessageId: event.message?.mid,
      status:            'READ',
      sentAt:            new Date(event.timestamp),
    },
  })
}
