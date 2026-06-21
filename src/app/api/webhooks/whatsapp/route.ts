import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { runCaptadorCycle } from '@/lib/captador/run-cycle'
import { markCampaignAsResponded } from '@/lib/reactivador/response-tracker'
import { upsertInboxConversation } from '@/lib/inbox/conversations'
import { createDefaultStages } from '@/lib/pipeline/stage-manager'
import { resolveWhatsAppMedia } from '@/lib/whatsapp/media'
import { analyzeImage, transcribeAudio } from '@/lib/ai/client'

export const dynamic     = 'force-dynamic'
export const maxDuration = 60

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
  image?:    { id: string; mime_type: string }
  audio?:    { id: string; mime_type: string }
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
        if (!['text', 'image', 'audio'].includes(msg.type)) continue

        const phone       = msg.from
        const contactName = contacts.find(c => c.wa_id === phone)?.profile.name

        console.log(`[wa-webhook] message from ${phone}, type=${msg.type}, phoneNumberId=${phoneNumberId ?? 'unknown'}`)

        try {
          const { leadId, clinicId } = await findOrCreateWhatsAppLead(phone, contactName, phoneNumberId)

          const text = await normalizeInboundMessage(msg, clinicId, leadId)
          if (!text) {
            console.log(`[wa-webhook] lead=${leadId} mensaje tipo ${msg.type} sin contenido procesable, se omite`)
            continue
          }

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

          await markCampaignAsResponded(leadId).catch(console.error)
          await runCaptadorCycle({ leadId, message: text, channel: 'WHATSAPP' }).catch(console.error)

          console.log(`[wa-webhook] lead=${leadId} processed`)
        } catch (err) {
          console.error(`[wa-webhook] error processing msg from ${phone}:`, err)
        }
      }
    }
  }
}

// ── Normaliza texto/imagen/audio entrante a un solo string para el agente ─
const SUPPORTED_AUDIO_MIME = ['audio/webm', 'audio/mp3', 'audio/wav', 'audio/m4a', 'audio/ogg']

async function normalizeInboundMessage(msg: WAMessage, clinicId: string, leadId: string): Promise<string | null> {
  if (msg.type === 'text') return msg.text?.body ?? null

  if (msg.type === 'image' && msg.image) {
    const media = await resolveWhatsAppMedia(msg.image.id, clinicId, leadId)
    if (!media) return '[El prospecto envió una imagen que no pudimos procesar]'
    const result = await analyzeImage({
      clinicId,
      imageUrl: media.blobUrl,
      context:  'Este es un negocio de odontología (clínica dental).',
    })
    return `[El prospecto envió una imagen] ${result.success ? result.data : 'Imagen recibida'}`
  }

  if (msg.type === 'audio' && msg.audio) {
    const media = await resolveWhatsAppMedia(msg.audio.id, clinicId, leadId)
    if (!media) return '[El prospecto envió un audio que no pudimos procesar]'
    const mimeType = (SUPPORTED_AUDIO_MIME.find(m => media.mimeType.startsWith(m)) ?? 'audio/ogg') as
      'audio/webm' | 'audio/mp3' | 'audio/wav' | 'audio/m4a' | 'audio/ogg'
    const result = await transcribeAudio({ clinicId, audioBuffer: media.buffer, mimeType })
    return result.success ? `[Mensaje de voz] "${result.data}"` : '[El prospecto envió un audio que no pudimos transcribir]'
  }

  return null
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
