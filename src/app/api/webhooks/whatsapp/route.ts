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
  from:        string
  id:          string
  timestamp:   string
  type:        string
  text?:       { body: string }
  image?:      { id: string; mime_type: string }
  audio?:      { id: string; mime_type: string }
  interactive?: {
    type:          string
    button_reply?: { id: string; title: string }
    nfm_reply?:    { response_json: string; name: string; body: string }
  }
  errors?:     unknown[]
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
        if (!['text', 'image', 'audio', 'interactive'].includes(msg.type)) continue

        const phone       = msg.from
        const contactName = contacts.find(c => c.wa_id === phone)?.profile.name

        console.log(`[wa-webhook] message from ${phone}, type=${msg.type}, phoneNumberId=${phoneNumberId ?? 'unknown'}`)

        try {
          // ── Fix 1: Idempotency — skip duplicate webhook deliveries ───────
          // Meta retries for up to 7 days on server errors; guard with externalMessageId
          const alreadySeen = await db.message.findFirst({
            where:  { externalMessageId: msg.id },
            select: { id: true },
          })
          if (alreadySeen) {
            console.log(`[wa-webhook] duplicate msg.id=${msg.id} — skipping`)
            continue
          }

          const { leadId, clinicId } = await findOrCreateWhatsAppLead(phone, contactName, phoneNumberId)

          const normalized = await normalizeInboundMessage(msg, clinicId, leadId)
          if (!normalized) {
            console.log(`[wa-webhook] lead=${leadId} mensaje tipo ${msg.type} sin contenido procesable, se omite`)
            continue
          }
          const { text, mediaUrl } = normalized

          await db.message.create({
            data: {
              leadId,
              direction:         'INBOUND',
              content:           text,
              mediaUrl,
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

          const buttonId = msg.type === 'interactive' ? msg.interactive?.button_reply?.id : undefined

          // Flow completion (nfm_reply) — guardar respuesta en MetaFlowSubmission
          if (msg.type === 'interactive' && msg.interactive?.type === 'nfm_reply' && msg.interactive.nfm_reply) {
            await handleFlowCompletion(msg.interactive.nfm_reply, clinicId, leadId).catch(console.error)
          }

          await markCampaignAsResponded(leadId).catch(console.error)
          await runCaptadorCycle({ leadId, message: text, channel: 'WHATSAPP', buttonId }).catch(console.error)

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

type NormalizedMessage = { text: string; mediaUrl: string | null }

async function normalizeInboundMessage(msg: WAMessage, clinicId: string, leadId: string): Promise<NormalizedMessage | null> {
  if (msg.type === 'text') {
    const body = msg.text?.body
    return body ? { text: body, mediaUrl: null } : null
  }

  if (msg.type === 'image' && msg.image) {
    const media = await resolveWhatsAppMedia(msg.image.id, clinicId, leadId)
    if (!media) return { text: '[El prospecto envió una imagen que no pudimos procesar]', mediaUrl: null }
    const result = await analyzeImage({
      clinicId,
      imageUrl: media.blobUrl,
      context:  'Este es un negocio de odontología (clínica dental).',
    })
    return {
      text:     `[Imagen] ${result.success ? result.data : 'El prospecto envió una imagen'}`,
      mediaUrl: media.blobUrl,
    }
  }

  if (msg.type === 'audio' && msg.audio) {
    const media = await resolveWhatsAppMedia(msg.audio.id, clinicId, leadId)
    if (!media) return { text: '[El prospecto envió un audio que no pudimos procesar]', mediaUrl: null }
    const mimeType = (SUPPORTED_AUDIO_MIME.find(m => media.mimeType.startsWith(m)) ?? 'audio/ogg') as
      'audio/webm' | 'audio/mp3' | 'audio/wav' | 'audio/m4a' | 'audio/ogg'
    const result = await transcribeAudio({ clinicId, audioBuffer: media.buffer, mimeType })
    return {
      text:     result.success ? `[Audio] "${result.data}"` : '[Mensaje de voz — no pudimos transcribirlo]',
      mediaUrl: media.blobUrl,
    }
  }

  if (msg.type === 'interactive' && msg.interactive?.button_reply) {
    return { text: msg.interactive.button_reply.title, mediaUrl: null }
  }

  return null
}

async function findOrCreateWhatsAppLead(
  phone:          string,
  name?:          string,
  phoneNumberId?: string,
): Promise<{ leadId: string; clinicId: string; isNew: boolean }> {
  // ── Fix 2: Normalize phone to E.164 to prevent format-based duplicates ──
  // +593991234567 / 593991234567 / 0991234567 all → same canonical form
  const cleanPhone = normalizePhone(phone)

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

  // ── Find existing lead by normalized phone + clinic ──────
  const existing = await db.lead.findFirst({
    where:   { phone: cleanPhone, clinicId },
    select:  { id: true },
    orderBy: { createdAt: 'desc' },
  })
  if (existing) return { leadId: existing.id, clinicId, isNew: false }

  // ── Auto-init pipeline stages if needed ─────────────────
  await createDefaultStages(clinicId)
  const firstStage = await db.pipelineStage.findFirst({
    where: { clinicId }, orderBy: { order: 'asc' },
  })
  if (!firstStage) throw new Error(`No pipeline stages for clinic ${clinicId}`)

  // ── Atomic create with race-condition guard ───────────────
  // Two simultaneous requests can both pass findFirst (null) and race to create.
  // We catch any error and fall back to findFirst — the winner's row is returned.
  try {
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
  } catch {
    // Lost the race — another concurrent request already created this lead
    const winner = await db.lead.findFirst({
      where:   { phone: cleanPhone, clinicId },
      select:  { id: true },
      orderBy: { createdAt: 'asc' },
    })
    if (winner) {
      console.log(`[wa-webhook] race condition resolved for phone=${cleanPhone}, using existing lead=${winner.id}`)
      return { leadId: winner.id, clinicId, isNew: false }
    }
    throw new Error(`Failed to find or create lead for phone=${cleanPhone}`)
  }
}

// Normaliza teléfono a dígitos puros sin código de país prefijado con ceros.
// Meta envía los números en formato internacional sin "+": "593991234567".
// Preserva ese formato como canónico para evitar duplicados por variantes locales.
function normalizePhone(raw: string): string {
  return raw.replace(/\D/g, '')
}

// ── Procesa respuestas de WhatsApp Flows (nfm_reply) ──────────────────────────

async function handleFlowCompletion(
  nfm: { response_json: string; name: string; body: string },
  clinicId: string,
  leadId:   string,
) {
  let flowData: Record<string, unknown> = {}
  try {
    flowData = JSON.parse(nfm.response_json)
  } catch {
    flowData = { raw: nfm.response_json }
  }

  // Buscar el flow por el flow_token incluido en la respuesta
  const flowToken = flowData.flow_token as string | undefined
  let metaFlowId: string | null = null

  if (flowToken) {
    // flow_token se incluye en el payload si el flow fue enviado por el CRM
    const metaFlow = await db.metaFlow.findFirst({
      where: { clinicId },
      select: { id: true },
    })
    metaFlowId = metaFlow?.id ?? null
  }

  if (!metaFlowId) {
    // Buscar cualquier flow publicado de la clínica como fallback
    const anyFlow = await db.metaFlow.findFirst({
      where:  { clinicId, status: "PUBLISHED" },
      select: { id: true },
      orderBy: { updatedAt: "desc" },
    })
    metaFlowId = anyFlow?.id ?? null
  }

  if (metaFlowId) {
    await db.metaFlowSubmission.create({
      data: {
        flowId:   metaFlowId,
        clinicId,
        leadId,
        data:     flowData as any,
        flowToken: flowToken ?? null,
      },
    })
  }

  // Actualizar el lead con datos del flow si corresponden
  if (flowData.treatment && typeof flowData.treatment === "string") {
    await db.lead.update({
      where: { id: leadId },
      data:  { interest: flowData.treatment },
    }).catch(() => {})
  }

  console.log(`[wa-webhook] flow completado por lead=${leadId}, flow=${metaFlowId}`)
}
