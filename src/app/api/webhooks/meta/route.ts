import { NextRequest, NextResponse } from 'next/server'
import { verifyMetaWebhookSignature, handleWebhookChallenge } from '@/lib/meta/verify-webhook'
import { parseMessengerWebhookPayload } from '@/lib/meta/parse-messenger-event'
import { processMessengerMessage, getClinicByPageId } from '@/lib/meta/lead-from-messenger'
import { markMessengerMessageSeen } from '@/lib/meta/messenger-client'
import { sendPushToClinicAdmins } from '@/lib/push/send-notification'

export const maxDuration = 30
export const dynamic     = 'force-dynamic'

// ── GET — initial webhook verification from Meta ─────────
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const { valid, challenge } = handleWebhookChallenge(searchParams)

  if (valid && challenge) {
    return new NextResponse(challenge, { status: 200 })
  }
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

// ── POST — receive events from Meta ──────────────────────
export async function POST(request: NextRequest) {
  const rawBody = await request.text()

  // Verify HMAC signature — never skip this
  const signature = request.headers.get('x-hub-signature-256') ?? ''
  if (!verifyMetaWebhookSignature(rawBody, signature)) {
    console.warn('[meta-webhook] invalid signature')
    return NextResponse.json({ error: 'Invalid signature' }, { status: 403 })
  }

  let body: unknown
  try {
    body = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Respond 200 immediately — process in background
  // Meta will retry if we don't respond in < 20s
  processWebhookEvents(body).catch(err =>
    console.error('[meta-webhook] processing error:', err)
  )

  return NextResponse.json({ status: 'ok' }, { status: 200 })
}

async function processWebhookEvents(body: unknown): Promise<void> {
  const payload = body as Record<string, unknown>
  const platform = payload.object as string

  if (platform === 'page') {
    await processMessengerEvents(payload)
  } else if (platform === 'instagram') {
    // Future: Instagram DM integration
    console.log('[meta-webhook] Instagram event received — integration pending')
  }
}

async function processMessengerEvents(body: unknown): Promise<void> {
  const events = parseMessengerWebhookPayload(body)

  for (const event of events) {
    if (event.type !== 'message' && event.type !== 'postback') continue

    try {
      // Find clinic by page ID
      const clinic = await getClinicByPageId(event.pageId)
      if (!clinic) {
        console.warn(`[meta-webhook] page ${event.pageId} not connected to any clinic`)
        continue
      }

      const pageToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN!

      // UX: mark as seen before processing
      markMessengerMessageSeen(event.senderId, pageToken).catch(() => {})

      const { leadId, isNew } = await processMessengerMessage(event, pageToken, clinic.id)

      if (isNew) {
        sendPushToClinicAdmins(clinic.id, {
          title: 'Nuevo mensaje en Messenger',
          body:  'Nuevo prospecto desde Facebook — revisa el pipeline',
          data:  { url: '/pipeline', type: 'appointment_created', entityId: leadId },
        }).catch(() => {})
      }
    } catch (err) {
      console.error(`[meta-webhook] error processing PSID ${event.senderId}:`, err)
    }
  }
}
