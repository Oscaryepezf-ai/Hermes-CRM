import { db } from '@/lib/db'
import { addMinutes } from 'date-fns'

const PLACEHOLDER_VALUES = ['placeholder', 'EAABs-placeholder', 'placeholder-phone-id']

// ── Whether the platform's own WhatsApp Business number is ready ─
// to send free-text messages to brand-new numbers (Meta requires a
// verified business + approved template/number for this — it is NOT
// the per-clinic ClinicChannel credentials used by the Captador).
export function isWhatsAppOtpReady(): boolean {
  const token   = process.env.WHATSAPP_TOKEN
  const phoneId = process.env.WHATSAPP_PHONE_ID
  if (!token || !phoneId) return false
  if (PLACEHOLDER_VALUES.some(p => token.includes(p) || phoneId.includes(p))) return false
  return true
}

// ── Generar y enviar código OTP por WhatsApp ─────────────
export async function sendWhatsAppOTP(
  phone: string // formato E.164: +593987654321
): Promise<{ success: true } | { success: false; error: string }> {
  if (!isWhatsAppOtpReady()) {
    return { success: false, error: 'El registro por WhatsApp no está disponible todavía.' }
  }

  // Limitar a 1 envío por minuto por número (anti-spam)
  const recent = await db.phoneVerification.findFirst({
    where: { phone, createdAt: { gte: new Date(Date.now() - 60_000) } },
  })
  if (recent) {
    return { success: false, error: 'Espera 1 minuto antes de solicitar otro código' }
  }

  const code      = Math.floor(100000 + Math.random() * 900000).toString()
  const expiresAt = addMinutes(new Date(), 10)

  await db.phoneVerification.create({ data: { phone, code, expiresAt } })

  try {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${process.env.WHATSAPP_PHONE_ID}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: phone.replace(/\D/g, ''),
          type: 'text',
          text: {
            body: `🦷 Tu código de verificación de Hermes CRM es: *${code}*\n\nExpira en 10 minutos. No lo compartas con nadie.`,
          },
        }),
      }
    )
    if (!response.ok) throw new Error('WhatsApp API error')
    return { success: true }
  } catch (error) {
    console.error('[sendWhatsAppOTP]', error)
    return { success: false, error: 'No pudimos enviar el código. Verifica tu número.' }
  }
}

// ── Verificar el código ingresado ────────────────────────
export async function verifyWhatsAppOTP(
  phone: string,
  code: string
): Promise<{ success: true } | { success: false; error: string }> {
  const verification = await db.phoneVerification.findFirst({
    where:   { phone, verified: false },
    orderBy: { createdAt: 'desc' },
  })

  if (!verification) {
    return { success: false, error: 'No hay un código pendiente para este número' }
  }
  if (verification.expiresAt < new Date()) {
    return { success: false, error: 'El código expiró. Solicita uno nuevo.' }
  }
  if (verification.attempts >= 5) {
    return { success: false, error: 'Demasiados intentos. Solicita un código nuevo.' }
  }
  if (verification.code !== code) {
    await db.phoneVerification.update({
      where: { id: verification.id },
      data:  { attempts: { increment: 1 } },
    })
    return { success: false, error: 'Código incorrecto' }
  }

  await db.phoneVerification.update({
    where: { id: verification.id },
    data:  { verified: true },
  })

  return { success: true }
}
