const GRAPH = 'https://graph.facebook.com/v18.0'

export async function sendWhatsAppTextMessage(
  phone:   string,
  message: string
): Promise<boolean> {
  const phoneId = process.env.WHATSAPP_PHONE_ID
  const token   = process.env.WHATSAPP_TOKEN
  if (!phoneId || !token) return false

  try {
    const res = await fetch(`${GRAPH}/${phoneId}/messages`, {
      method:  'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
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
