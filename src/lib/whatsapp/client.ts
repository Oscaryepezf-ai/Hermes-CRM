import { db } from '@/lib/db'

const GRAPH = 'https://graph.facebook.com/v18.0'

// ── Get WhatsApp credentials for a clinic ────────────────
export async function getWhatsAppCredentials(
  clinicId: string
): Promise<{ phoneId: string; token: string } | null> {
  const channel = await db.clinicChannel.findUnique({
    where:  { clinicId_channel: { clinicId, channel: 'WHATSAPP' } },
    select: { pageId: true, accessToken: true, isActive: true },
  })
  if (channel?.isActive && channel.pageId && channel.accessToken) {
    return { phoneId: channel.pageId, token: channel.accessToken }
  }
  // Fallback to env vars (legacy / dev)
  const phoneId = process.env.WHATSAPP_PHONE_ID
  const token   = process.env.WHATSAPP_TOKEN
  return phoneId && token ? { phoneId, token } : null
}

// ── Send a plain text message ─────────────────────────────
export async function sendWhatsAppTextMessage(
  phone:       string,
  message:     string,
  credentials?: { phoneId: string; token: string }
): Promise<boolean> {
  if (!credentials) return false

  try {
    const res = await fetch(`${GRAPH}/${credentials.phoneId}/messages`, {
      method:  'POST',
      headers: {
        'Authorization': `Bearer ${credentials.token}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to:                phone.replace(/\D/g, ''),
        type:              'text',
        text:              { body: message },
      }),
    })
    return res.ok
  } catch {
    return false
  }
}

// ── Send using clinic DB credentials (convenience) ───────
export async function sendWhatsAppMessageForClinic(
  clinicId: string,
  phone:    string,
  message:  string,
): Promise<boolean> {
  const creds = await getWhatsAppCredentials(clinicId)
  if (!creds) return false
  return sendWhatsAppTextMessage(phone, message, creds)
}
