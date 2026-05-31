import { createHmac } from 'crypto'

export function verifyMetaWebhookSignature(
  payload:   string,
  signature: string
): boolean {
  if (!signature.startsWith('sha256=')) return false
  if (!process.env.META_APP_SECRET) return false

  const expected = createHmac('sha256', process.env.META_APP_SECRET)
    .update(payload, 'utf8')
    .digest('hex')

  const received = signature.slice('sha256='.length)

  if (expected.length !== received.length) return false

  // Constant-time comparison to prevent timing attacks
  let mismatch = 0
  for (let i = 0; i < expected.length; i++) {
    mismatch |= expected.charCodeAt(i) ^ received.charCodeAt(i)
  }
  return mismatch === 0
}

export function handleWebhookChallenge(searchParams: URLSearchParams): {
  valid:     boolean
  challenge: string | null
} {
  const mode      = searchParams.get('hub.mode')
  const token     = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === process.env.META_VERIFY_TOKEN) {
    return { valid: true, challenge }
  }
  return { valid: false, challenge: null }
}
