import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { runCaptadorCycle } from '@/lib/captador/run-cycle'
import { markCampaignAsResponded } from '@/lib/reactivador/response-tracker'
import { upsertInboxConversation } from '@/lib/inbox/conversations'
import { createDefaultStages } from '@/lib/pipeline/stage-manager'

export const dynamic     = 'force-dynamic'
export const maxDuration = 30

// ── GET — webhook verification ────────────────────────────
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const mode      = searchParams.get('hub.mode')
  const token     = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === process.env.META_VERIFY_TOKEN && challenge) {
    return new NextResponse(challenge, { status: 200 })
  }
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

// ── POST — receive WhatsApp messages ─────────────────────
export async function POST(request: NextRequest) {
  let body: unknown
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Must await — Vercel terminates function once response is sent
  await processWhatsAppEvents(body).catch(err =>
    console.error('[wa-webhook] error:', err?.message ?? err)
  )

  return NextResponse.json({ status: 'ok' }, { status: 200 })
}

type WAMessage = {
  from:      string
  id:        string
  timestamp: string
  type:      string
  text?:     { body: string }
  errors?:   unknown[]
}

type WAMetadata = {
  display_phone_number: string
  phone_number_id:      string
}

async function processWhatsAppEvents(body: unknown): Promise<void> {
  const payload = body as Record<string, unknown>
  if (payload.object !== 'whatsapp_business_account') return

  for (const entry of (payload.entry as { changes?: { value?: unknown }[] }[]) ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value as Record<string, unknown> | undefined
      if (!value || value.messaging_product !== 'whatsapp') continue

      const metadata = value.metadata as WAMetadata | undefined
      const phoneNumberId = metadata?.phone_number_id

      const messages = (value.messages as WAMessage[]) ?? []
      const contacts  = (value.contacts as { wa_id: string; profile: { name: string } }[]) ?? []

      for (const msg of messages) {
        if (msg.type !== 'text' || !msg.text?.body) continue

        const phone       = msg.from
        const text        = msg.text.body
        const contactName = contacts.find(c => c.wa_id === phone)?.profile.name

        console.log(`[wa-webhook] message from ${phone}, phoneNumberId=${phoneNumberId ?? 'unknown'}`)

        try {
          const { leadId, clinicId } = await findOrCreateWhatsAppLead(phone, contactName, phoneNumberId)

          await db.message.create({
            data: {
              leadId,
              direction:         'INBOUND',
              content:           text,
              channel:           'WHATSAPP',
              externalMessageId: msg.id,
              status:            'READ',
              sentAt:            new Date(parseInt(msg.timestamp) * 1000),
            },
          })

          await db.lead.update({
            where: { id: leadId },
            data:  { lastContactAt: new Date(), lastActivityAt: new Date(), totalTouchpoints: { increment: 1 } },
          })

          await upsertInboxConversation({ clinicId, leadId, channel: 'WHATSAPP', preview: text, isInbound: true })

          markCampaignAsResponded(leadId).catch(console.error)
          runCaptadorCycle({ leadId, message: text, channel: 'WHATSAPP' }).catch(console.error)

          console.log(`[wa-webhook] lead=${leadId} processed`)
        } catch (err) {
          console.error(`[wa-webhook] error processing msg from ${phone}:`, err)
        }
      }
    }
  }
}

async function findOrCreateWhatsAppLead(
  phone:         string,
  name?:         string,
  phoneNumberId?: string,
): Promise<{ leadId: string; clinicId: string; isNew: boolean }> {
  const cleanPhone = phone.replace(/\D/g, '')

  // ── Find the clinic via ClinicChannel (multi-tenant) ────
  let clinicId: string | null = null
  if (phoneNumberId) {
    const channel = await db.clinicChannel.findFirst({
      where: { pageId: phoneNumberId, channel: 'WHATSAPP', isActive: true },
    })
    if (channel) clinicId = channel.clinicId
  }

  // Fallback: env var phone ID → any clinic (legacy / dev setup)
  if (!clinicId && process.env.WHATSAPP_PHONE_ID) {
    const first = await db.clinic.findFirst({ select: { id: true } })
    if (first) clinicId = first.id
  }

  if (!clinicId) throw new Error(`No clinic configured for WhatsApp phoneNumberId=${phoneNumberId}`)

  // ── Find existing lead by phone + clinic ─────────────────
  const existing = await db.lead.findFirst({
    where:  { phone: cleanPhone, clinicId },
    select: { id: true },
    orderBy: { createdAt: 'desc' },
  })
  if (existing) return { leadId: existing.id, clinicId, isNew: false }

  // ── Auto-init pipeline stages if needed ─────────────────
  await createDefaultStages(clinicId)
  const firstStage = await db.pipelineStage.findFirst({
    where: { clinicId }, orderBy: { order: 'asc' },
  })
  if (!firstStage) throw new Error(`No pipeline stages for clinic ${clinicId}`)

  const lead = await db.lead.create({
    data: {
      clinicId,
      fullName:      name ?? `WhatsApp (${cleanPhone.slice(-4)})`,
      phone:         cleanPhone,
      source:        'WHATSAPP',
      channel:       'WHATSAPP',
      status:        'NUEVO',
      journeyState:  'PROSPECTO',
      stageId:       firstStage.id,
      lastContactAt: new Date(),
      lastActivityAt: new Date(),
    },
  })

  await db.journeyEvent.create({
    data: {
      leadId:      lead.id,
      type:        'MESSAGE_RECEIVED',
      toState:     'PROSPECTO',
      isAutomatic: true,
      metadata:    { source: 'whatsapp', phone: cleanPhone },
      note:        'Lead creado automáticamente desde WhatsApp',
    },
  })

  return { leadId: lead.id, clinicId, isNew: true }
}
