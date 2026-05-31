import { db } from '@/lib/db'
import { getMessengerUserProfile } from './messenger-client'
import type { ParsedMessengerEvent } from './parse-messenger-event'

export async function getClinicByPageId(pageId: string) {
  return db.clinic.findFirst({
    where: { facebookPageId: pageId, messengerActive: true },
  })
}

export async function processMessengerMessage(
  event:           ParsedMessengerEvent,
  pageAccessToken: string,
  clinicId:        string
): Promise<{ leadId: string; isNew: boolean }> {
  const psid = event.senderId

  // Check for existing lead via SocialProfile
  const existing = await db.socialProfile.findUnique({
    where: { channel_externalId: { channel: 'FACEBOOK', externalId: psid } },
    select: { leadId: true },
  })

  if (existing) {
    await saveInboundMessage(existing.leadId, event)
    await db.lead.update({
      where: { id: existing.leadId },
      data: {
        lastContactAt:    new Date(),
        lastActivityAt:   new Date(),
        totalTouchpoints: { increment: 1 },
      },
    })
    return { leadId: existing.leadId, isNew: false }
  }

  // New lead — fetch Meta profile
  const profile = await getMessengerUserProfile(psid, pageAccessToken)
  const name    = profile?.name ?? `Messenger (${psid.slice(-6)})`

  const firstStage = await db.pipelineStage.findFirst({
    where: { clinicId }, orderBy: { order: 'asc' },
  })
  if (!firstStage) throw new Error(`No pipeline stages for clinic ${clinicId}`)

  const lead = await db.$transaction(async (tx) => {
    const newLead = await tx.lead.create({
      data: {
        clinicId,
        fullName:         name,
        phone:            'Facebook Messenger',
        source:           'FACEBOOK',
        channel:          'FACEBOOK',
        status:           'NUEVO',
        journeyState:     'PROSPECTO',
        stageId:          firstStage.id,
        lastContactAt:    new Date(),
        lastActivityAt:   new Date(),
      },
    })

    await tx.socialProfile.create({
      data: {
        leadId:       newLead.id,
        channel:      'FACEBOOK',
        externalId:   psid,
        displayName:  name,
        profilePicUrl: profile?.profilePic,
        locale:       profile?.locale,
        timezone:     profile?.timezone,
        rawProfile:   profile ? JSON.parse(JSON.stringify(profile)) : undefined,
      },
    })

    if (event.message?.text) {
      await tx.message.create({
        data: {
          leadId:            newLead.id,
          direction:         'INBOUND',
          content:           event.message.text,
          channel:           'FACEBOOK',
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
        metadata:    { source: 'facebook_messenger', psid, trigger: 'inbound_message' },
        note:        'Lead creado automáticamente desde Facebook Messenger',
      },
    })

    return newLead
  })

  return { leadId: lead.id, isNew: true }
}

async function saveInboundMessage(
  leadId: string,
  event:  ParsedMessengerEvent
): Promise<void> {
  if (!event.message?.text && !event.message?.attachments) return

  // Deduplication by externalMessageId
  if (event.message?.mid) {
    const exists = await db.message.findFirst({
      where: { externalMessageId: event.message.mid },
    })
    if (exists) return
  }

  const content =
    event.message?.text ??
    `[${event.message?.attachments?.[0]?.type ?? 'archivo'}]`

  await db.message.create({
    data: {
      leadId,
      direction:         'INBOUND',
      content,
      channel:           'FACEBOOK',
      externalMessageId: event.message?.mid,
      status:            'READ',
      sentAt:            new Date(event.timestamp),
    },
  })
}
