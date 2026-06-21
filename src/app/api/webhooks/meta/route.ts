import { NextRequest, NextResponse } from 'next/server'
import { verifyMetaWebhookSignature, handleWebhookChallenge } from '@/lib/meta/verify-webhook'
import { parseMessengerWebhookPayload } from '@/lib/meta/parse-messenger-event'
import {
  processMessengerMessage, processInstagramMessage,
  getClinicByPageId, getClinicByIgAccountId, getChannelAccessToken,
} from '@/lib/meta/lead-from-messenger'
import { markMessengerMessageSeen } from '@/lib/meta/messenger-client'
import { markInstagramMessageSeen } from '@/lib/meta/instagram-client'
import { sendPushToClinicAdmins } from '@/lib/push/send-notification'
import { runCaptadorCycle } from '@/lib/captador/run-cycle'
import { upsertInboxConversation } from '@/lib/inbox/conversations'

export const maxDuration = 60
export const dynamic     = 'force-dynamic'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const { valid, challenge } = handleWebhookChallenge(searchParams)
  if (valid && challenge) return new NextResponse(challenge, { status: 200 })
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text()
  console.log('[meta-webhook] POST received, body length:', rawBody.length, 'at', new Date().toISOString())

  const signature = request.headers.get('x-hub-signature-256') ?? ''
  const sigOk = verifyMetaWebhookSignature(rawBody, signature)
  console.log('[meta-webhook] signature header:', signature.slice(0, 20), '... valid:', sigOk)

  if (!sigOk) {
    console.warn('[meta-webhook] SIGNATURE FAILED — app secret mismatch or missing header')
    return NextResponse.json({ error: 'Invalid signature' }, { status: 403 })
  }

  let body: unknown
  try { body = JSON.parse(rawBody) } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const platform = (body as Record<string, unknown>).object
  console.log('[meta-webhook] object type:', platform)

  // Must await before returning — Vercel terminates the function when the response is sent
  await processWebhookEvents(body).catch(err =>
    console.error('[meta-webhook] processing error:', err?.message ?? err)
  )

  console.log('[meta-webhook] processing complete')
  return NextResponse.json({ status: 'ok' }, { status: 200 })
}

async function processWebhookEvents(body: unknown): Promise<void> {
  const payload  = body as Record<string, unknown>
  const platform = payload.object as string

  if (platform === 'page') {
    await processMessengerEvents(payload)
  } else if (platform === 'instagram') {
    await processInstagramEvents(payload)
  }
}

// ── Facebook Messenger ────────────────────────────────────
async function processMessengerEvents(body: unknown): Promise<void> {
  const events = parseMessengerWebhookPayload(body)

  for (const event of events) {
    if (event.type !== 'message' && event.type !== 'postback') continue
    try {
      const clinic = await getClinicByPageId(event.pageId)
      if (!clinic) {
        console.warn(`[meta-webhook] FB page ${event.pageId} not connected`)
        continue
      }

      // Try DB token first, fall back to env var
      const pageToken =
        (await getChannelAccessToken(clinic.id, 'FACEBOOK')) ??
        process.env.FACEBOOK_PAGE_ACCESS_TOKEN ?? ''

      markMessengerMessageSeen(event.senderId, pageToken).catch(() => {})

      const { leadId, isNew } = await processMessengerMessage(event, pageToken, clinic.id)

      if (isNew) {
        sendPushToClinicAdmins(clinic.id, {
          title: 'Nuevo mensaje en Messenger',
          body:  'Nuevo prospecto desde Facebook — revisa el pipeline',
          data:  { url: '/pipeline', type: 'appointment_created', entityId: leadId },
        }).catch(() => {})
      }

      // Inbox conversation
      if (event.message?.text) {
        await upsertInboxConversation({ clinicId: clinic.id, leadId, channel: 'FACEBOOK', preview: event.message.text, isInbound: true }).catch(console.error)
        await runCaptadorCycle({ leadId, message: event.message.text, channel: 'FACEBOOK' }).catch(console.error)
      }
    } catch (err) {
      console.error(`[meta-webhook] FB PSID ${event.senderId}:`, err)
    }
  }
}

// ── Instagram DM ──────────────────────────────────────────
async function processInstagramEvents(body: unknown): Promise<void> {
  const events = parseMessengerWebhookPayload(body)  // same structure as Messenger

  for (const event of events) {
    if (event.type !== 'message' && event.type !== 'postback') continue
    try {
      // pageId = Instagram Business Account ID in IG webhooks
      const result = await getClinicByIgAccountId(event.pageId)
      if (!result) {
        console.warn(`[meta-webhook] IG account ${event.pageId} not connected`)
        continue
      }

      const { clinic, accessToken } = result
      const pageToken = accessToken ?? ''

      markInstagramMessageSeen(event.senderId, event.pageId, pageToken).catch(() => {})

      const { leadId, isNew } = await processInstagramMessage(event, pageToken, clinic.id)

      if (isNew) {
        sendPushToClinicAdmins(clinic.id, {
          title: 'Nuevo mensaje en Instagram',
          body:  'Nuevo prospecto desde Instagram DM — revisa el pipeline',
          data:  { url: '/pipeline', type: 'appointment_created', entityId: leadId },
        }).catch(() => {})
      }

      if (event.message?.text) {
        await upsertInboxConversation({ clinicId: clinic.id, leadId, channel: 'INSTAGRAM', preview: event.message.text, isInbound: true }).catch(console.error)
        await runCaptadorCycle({ leadId, message: event.message.text, channel: 'INSTAGRAM' }).catch(console.error)
      }
    } catch (err) {
      console.error(`[meta-webhook] IG IGSID ${event.senderId}:`, err)
    }
  }
}
