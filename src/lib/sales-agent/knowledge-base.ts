import { db } from '@/lib/db'
import { generateEmbedding } from '@/lib/ai/client'
import type { KnowledgeSourceType } from '@prisma/client'

// ── Ingestión: dividir documento en chunks + generar embeddings ─
export async function ingestDocument(params: {
  clinicId:   string
  title:      string
  sourceType: KnowledgeSourceType
  content:    string
}): Promise<{ success: true; documentId: string; chunksCreated: number } | { success: false; error: string }> {
  const document = await db.knowledgeDocument.create({
    data: {
      clinicId:   params.clinicId,
      title:      params.title,
      sourceType: params.sourceType,
      rawContent: params.content,
    },
  })

  const chunks = splitIntoChunks(params.content, 500, 50)
  let created = 0

  for (let i = 0; i < chunks.length; i++) {
    const embeddingResult = await generateEmbedding({ clinicId: params.clinicId, text: chunks[i] })
    if (!embeddingResult.success) {
      // Si el primer chunk falla por presupuesto/IA, abortamos limpio.
      if (created === 0) {
        await db.knowledgeDocument.delete({ where: { id: document.id } })
        return { success: false, error: embeddingResult.error }
      }
      continue
    }

    const vectorStr = `[${embeddingResult.data.join(',')}]`
    await db.$executeRaw`
      INSERT INTO "KnowledgeChunk" (id, "documentId", "clinicId", content, embedding, "chunkIndex", "createdAt")
      VALUES (gen_random_uuid()::text, ${document.id}, ${params.clinicId}, ${chunks[i]},
              ${vectorStr}::vector, ${i}, now())
    `
    created++
  }

  return { success: true, documentId: document.id, chunksCreated: created }
}

function splitIntoChunks(text: string, size: number, overlap: number): string[] {
  const chunks: string[] = []
  let start = 0
  while (start < text.length) {
    chunks.push(text.slice(start, start + size))
    start += size - overlap
  }
  return chunks
}

// ── Búsqueda semántica: traer solo lo relevante al mensaje ─
export async function searchKnowledgeBase(
  clinicId: string,
  query:    string,
  topK:     number = 4,
): Promise<{ content: string; similarity: number }[]> {
  const embeddingResult = await generateEmbedding({ clinicId, text: query })
  if (!embeddingResult.success) return []

  const vectorStr = `[${embeddingResult.data.join(',')}]`

  const results = await db.$queryRaw<{ content: string; distance: number }[]>`
    SELECT content, embedding <=> ${vectorStr}::vector AS distance
    FROM "KnowledgeChunk"
    WHERE "clinicId" = ${clinicId}
    ORDER BY distance ASC
    LIMIT ${topK}
  `

  return results.map(r => ({ content: r.content, similarity: 1 - r.distance }))
}

// ── Construir el contexto de KB para inyectar en el prompt ─
export async function buildKnowledgeContext(clinicId: string, message: string): Promise<string> {
  const hasAnyDoc = await db.knowledgeDocument.count({ where: { clinicId } })
  if (hasAnyDoc === 0) return ''

  const chunks = await searchKnowledgeBase(clinicId, message)
  if (chunks.length === 0) return ''

  return `\n\nCONTEXTO RELEVANTE DE LA BASE DE CONOCIMIENTO:\n` +
    chunks.map((c, i) => `[${i + 1}] ${c.content}`).join('\n\n')
}

// ── Gestión de documentos (para la UI de Ajustes) ─────────
export async function getClinicKnowledgeDocuments(clinicId: string) {
  return db.knowledgeDocument.findMany({
    where:   { clinicId },
    select:  { id: true, title: true, sourceType: true, createdAt: true, _count: { select: { chunks: true } } },
    orderBy: { createdAt: 'desc' },
  })
}

export async function deleteKnowledgeDocument(documentId: string, clinicId: string): Promise<boolean> {
  const doc = await db.knowledgeDocument.findUnique({ where: { id: documentId }, select: { clinicId: true } })
  if (!doc || doc.clinicId !== clinicId) return false
  await db.knowledgeDocument.delete({ where: { id: documentId } })
  return true
}
