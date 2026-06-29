export type FlowButton = { id: string; label: string; nextNodeId: string | null }
export type FlowNodeKind = 'MESSAGE' | 'HANDOFF' | 'END'
export type FlowMediaType = 'image' | 'video' | 'document'

// Límites de WhatsApp Cloud API por tipo de media — compartidos entre el
// validador de la Server Action y el chequeo previo en el navegador (evita
// que una subida de más de bodySizeLimit tumbe la página con un 413).
export const FLOW_MEDIA_MAX_BYTES: Record<FlowMediaType, number> = {
  image:    5  * 1024 * 1024,
  video:    16 * 1024 * 1024,
  document: 20 * 1024 * 1024,
}
