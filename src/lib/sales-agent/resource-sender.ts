import { db } from '@/lib/db'
import type { SalesStage } from '@prisma/client'

export type SalesResource = { type: string; url: string }

// ── Decide qué recurso enviar según la etapa y lo ya enviado ─
export function decideResourceToSend(params: {
  stage:         SalesStage
  resourcesSent: string[]
}): SalesResource | null {
  const { stage, resourcesSent } = params

  if (stage === 'CONSTRUCCION_VALOR' && !resourcesSent.includes('testimonios') && process.env.TESTIMONIOS_VIDEO_URL) {
    return { type: 'testimonios', url: process.env.TESTIMONIOS_VIDEO_URL }
  }
  if (stage === 'CIERRE_SUAVE' && !resourcesSent.includes('link_agenda') && process.env.AGENDA_BOOKING_URL) {
    return { type: 'link_agenda', url: process.env.AGENDA_BOOKING_URL }
  }
  return null
}

export async function markResourceSent(leadId: string, resourceType: string): Promise<void> {
  const conv = await db.agentConversation.findUnique({ where: { leadId }, select: { resourcesSent: true } })
  if (!conv) return

  const sent = conv.resourcesSent as string[]
  if (!sent.includes(resourceType)) {
    await db.agentConversation.update({
      where: { leadId },
      data:  { resourcesSent: [...sent, resourceType] },
    })
  }
}
