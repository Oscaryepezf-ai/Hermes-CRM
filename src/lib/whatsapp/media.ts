import { put } from '@vercel/blob'
import { getWhatsAppCredentials } from './client'

const GRAPH = 'https://graph.facebook.com/v19.0'

export type ResolvedMedia = {
  buffer:   Buffer
  mimeType: string
  blobUrl:  string
}

/**
 * WhatsApp Cloud API solo manda un `media_id` en el webhook — hay que
 * resolverlo a una URL temporal y luego descargar los bytes (2 llamadas).
 * Sube el resultado a Vercel Blob (mismo patrón que lib/actions/files.ts)
 * para tener una URL pública que se pueda pasar a la API de Visión de OpenAI.
 */
export async function resolveWhatsAppMedia(
  mediaId:  string,
  clinicId: string,
  leadId:   string,
): Promise<ResolvedMedia | null> {
  const creds = await getWhatsAppCredentials(clinicId)
  if (!creds) return null

  try {
    const metaRes = await fetch(`${GRAPH}/${mediaId}`, {
      headers: { Authorization: `Bearer ${creds.token}` },
    })
    if (!metaRes.ok) return null
    const meta = await metaRes.json() as { url?: string; mime_type?: string }
    if (!meta.url) return null

    const fileRes = await fetch(meta.url, {
      headers: { Authorization: `Bearer ${creds.token}` },
    })
    if (!fileRes.ok) return null

    const arrayBuffer = await fileRes.arrayBuffer()
    const buffer      = Buffer.from(arrayBuffer)
    const mimeType    = meta.mime_type ?? fileRes.headers.get('content-type') ?? 'application/octet-stream'
    const ext         = mimeType.split('/')[1]?.split(';')[0] ?? 'bin'

    const blob = await put(
      `whatsapp-media/${leadId}/${Date.now()}-${mediaId}.${ext}`,
      buffer,
      { access: 'public', contentType: mimeType },
    )

    return { buffer, mimeType, blobUrl: blob.url }
  } catch (err) {
    console.error('[whatsapp-media] error resolviendo media:', err)
    return null
  }
}
