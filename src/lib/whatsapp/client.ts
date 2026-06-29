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

// ── Send an interactive message with up to 3 reply buttons ──
// (usado por el Constructor de Flujos — header opcional de imagen/documento,
// cuerpo de texto, y hasta 3 botones de respuesta rápida)
export async function sendWhatsAppInteractiveMessage(
  phone:       string,
  options: {
    bodyText:   string
    mediaUrl?:  string | null
    mediaType?: 'image' | 'document' | null
    buttons:    { id: string; title: string }[]
  },
  credentials?: { phoneId: string; token: string }
): Promise<boolean> {
  if (!credentials) return false
  if (options.buttons.length === 0 || options.buttons.length > 3) return false

  const header = options.mediaUrl && options.mediaType
    ? options.mediaType === 'image'
      ? { type: 'image', image: { link: options.mediaUrl } }
      : { type: 'document', document: { link: options.mediaUrl, filename: 'documento.pdf' } }
    : undefined

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
        type:              'interactive',
        interactive: {
          type:   'button',
          ...(header && { header }),
          body:   { text: options.bodyText },
          action: {
            buttons: options.buttons.map(b => ({
              type:  'reply',
              reply: { id: b.id, title: b.title.slice(0, 20) },
            })),
          },
        },
      }),
    })
    return res.ok
  } catch {
    return false
  }
}
