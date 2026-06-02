import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { runCaptadorCycle } from '@/lib/captador/run-cycle'
import { markCampaignAsResponded } from '@/lib/reactivador/response-tracker'

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

  processWhatsAppEvents(body).catch(err =>
    console.error('[wa-webhook] error:', err)
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

async function processWhatsAppEvents(body: unknown): Promise<void> {
  const payload = body as Record<string, unknown>
  if (payload.object !== 'whatsapp_business_account') return

  for (const entry of (payload.entry as { changes?: { value?: unknown }[] }[]) ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value as Record<string, unknown> | undefined
      if (!value || value.messaging_product !== 'whatsapp') continue

      const messages = (value.messages as WAMessage[]) ?? []
      const contacts = (value.contacts as { wa_id: string; profile: { name: string } }[]) ?? []

      for (const msg of messages) {
        if (msg.type !== 'text' || !msg.text?.body) continue

        const phone    = msg.from
        const text     = msg.text.body
        const contactName = contacts.find(c => c.wa_id === phone)?.profile.name

        try {
          // Find or create lead by phone
          const { leadId, isNew } = await findOrCreateWhatsAppLead(phone, contactName)

          // Save inbound message
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

          // Update lead activity
          await db.lead.update({
            where: { id: leadId },
            data:  { lastContactAt: new Date(), lastActivityAt: new Date(), totalTouchpoints: { increment: 1 } },
          })

          // Si el lead tiene campaña de reactivación activa → marcar como respondida
          markCampaignAsResponded(leadId).catch(console.error)

          // Run Captador cycle in background
          runCaptadorCycle({ leadId, message: text, channel: 'WHATSAPP' }).catch(console.error)

        } catch (err) {
          console.error(`[wa-webhook] error processing msg from ${phone}:`, err)
        }
      }
    }
  }
}

async function findOrCreateWhatsAppLead(
  phone:    string,
  name?:    string
): Promise<{ leadId: string; isNew: boolean }> {
  // Find existing lead by phone in any clinic (use first match)
  // In a real multi-tenant setup, you'd also filter by phoneNumberId
  const existing = await db.lead.findFirst({
    where:  { phone: phone.replace(/\D/g, '') },
    select: { id: true },
    orderBy: { createdAt: 'desc' },
  })

  if (existing) return { leadId: existing.id, isNew: false }

  // Need to find the clinic linked to this WhatsApp number
  // For now, use the first clinic with captadorActive (demo setup)
  // Production: filter by WHATSAPP_PHONE_ID matched to Clinic
  const clinic = await db.clinic.findFirst({
    where:   { captadorActive: true },
    include: { pipelineStages: { orderBy: { order: 'asc' }, take: 1 } },
  })

  if (!clinic) {
    // Fallback: any clinic
    const anyClinic = await db.clinic.findFirst({
      include: { pipelineStages: { orderBy: { order: 'asc' }, take: 1 } },
    })
    if (!anyClinic) throw new Error('No clinic found')

    const lead = await db.lead.create({
      data: {
        clinicId:      anyClinic.id,
        fullName:      name ?? `WhatsApp (${phone.slice(-4)})`,
        phone:         phone.replace(/\D/g, ''),
        source:        'WHATSAPP',
        channel:       'WHATSAPP',
        status:        'NUEVO',
        journeyState:  'PROSPECTO',
        stageId:       anyClinic.pipelineStages[0]?.id,
        lastContactAt: new Date(),
        lastActivityAt:new Date(),
      },
    })
    return { leadId: lead.id, isNew: true }
  }

  const lead = await db.lead.create({
    data: {
      clinicId:      clinic.id,
      fullName:      name ?? `WhatsApp (${phone.slice(-4)})`,
      phone:         phone.replace(/\D/g, ''),
      source:        'WHATSAPP',
      channel:       'WHATSAPP',
      status:        'NUEVO',
      journeyState:  'PROSPECTO',
      stageId:       clinic.pipelineStages[0]?.id,
      lastContactAt: new Date(),
      lastActivityAt:new Date(),
    },
  })
  return { leadId: lead.id, isNew: true }
}
