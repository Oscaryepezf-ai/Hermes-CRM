"use server"

import { z } from "zod"
import { requirePermission, unauthorizedResponse } from "@/lib/rbac/guards"
import { ingestDocument, getClinicKnowledgeDocuments, deleteKnowledgeDocument } from "@/lib/sales-agent/knowledge-base"
import { revalidatePath } from "next/cache"

const IngestSchema = z.object({
  title:      z.string().min(2).max(150),
  sourceType: z.enum(["TEXTO_MANUAL", "FAQ", "TESTIMONIOS", "GUION_OBJECIONES"]),
  content:    z.string().min(20).max(20000),
})

export async function uploadKnowledgeDocument(data: z.infer<typeof IngestSchema>) {
  const guard = await requirePermission("hermes_ai", "configure")
  if (!guard.authorized) return unauthorizedResponse(guard.error)

  const parsed = IngestSchema.safeParse(data)
  if (!parsed.success) return { success: false as const, error: parsed.error.issues[0].message }

  const result = await ingestDocument({ clinicId: guard.user.clinicId, ...parsed.data })
  if (!result.success) return result

  revalidatePath("/settings/assistant")
  return result
}

export async function getKnowledgeDocuments() {
  const guard = await requirePermission("hermes_ai", "view")
  if (!guard.authorized) return unauthorizedResponse(guard.error)

  const docs = await getClinicKnowledgeDocuments(guard.user.clinicId)
  return { success: true as const, data: docs }
}

export async function removeKnowledgeDocument(documentId: string) {
  const guard = await requirePermission("hermes_ai", "configure")
  if (!guard.authorized) return unauthorizedResponse(guard.error)

  const ok = await deleteKnowledgeDocument(documentId, guard.user.clinicId)
  if (!ok) return { success: false as const, error: "Documento no encontrado" }

  revalidatePath("/settings/assistant")
  return { success: true as const }
}
