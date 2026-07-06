"use server"

import { z } from "zod"
import { put, del } from "@vercel/blob"
import { db } from "@/lib/db"
import { requirePermission, unauthorizedResponse } from "@/lib/rbac/guards"
import { revalidatePath } from "next/cache"
import { FLOW_MEDIA_MAX_BYTES } from "@/lib/flows/types"

const ButtonSchema = z.object({
  id:         z.string().min(1),
  label:      z.string().min(1).max(20),
  nextNodeId: z.string().nullable(),
})

const NodeSchema = z.object({
  id:        z.string().min(1),
  type:      z.enum(["MESSAGE", "HANDOFF", "END"]),
  text:      z.string().min(1).max(2000),
  mediaUrl:  z.string().url().nullable(),
  mediaType: z.enum(["image", "video", "document"]).nullable(),
  buttons:   z.array(ButtonSchema).max(3),
  positionX: z.number(),
  positionY: z.number(),
})

export async function getFlows() {
  const guard = await requirePermission("hermes_ai", "view")
  if (!guard.authorized) return unauthorizedResponse(guard.error)

  const flows = await db.flow.findMany({
    where:   { clinicId: guard.user.clinicId },
    orderBy: { createdAt: "desc" },
    select:  { id: true, name: true, updatedAt: true, _count: { select: { nodes: true } } },
  })
  return { success: true as const, data: flows }
}

export async function getFlow(flowId: string) {
  const guard = await requirePermission("hermes_ai", "view")
  if (!guard.authorized) return unauthorizedResponse(guard.error)

  const flow = await db.flow.findFirst({
    where:   { id: flowId, clinicId: guard.user.clinicId },
    include: { nodes: true },
  })
  if (!flow) return { success: false as const, error: "Flujo no encontrado" }
  return { success: true as const, data: flow }
}

export async function createFlow(name: string) {
  const guard = await requirePermission("hermes_ai", "configure")
  if (!guard.authorized) return unauthorizedResponse(guard.error)

  const parsedName = z.string().min(2).max(80).safeParse(name)
  if (!parsedName.success) return { success: false as const, error: "Nombre inválido" }

  const flow = await db.flow.create({
    data: {
      clinicId: guard.user.clinicId,
      name:     parsedName.data,
      nodes: {
        create: [
          { type: "MESSAGE", text: "¡Hola! 😊 ¿En qué puedo ayudarte hoy?", positionX: 80,  positionY: 120, buttons: [] },
          { type: "HANDOFF", text: "Te conecto con nuestro equipo, en breve te contactan.", positionX: 420, positionY: 60,  buttons: [] },
          { type: "END",     text: "¡Gracias por escribirnos! 😊",                          positionX: 420, positionY: 220, buttons: [] },
        ],
      },
    },
    include: { nodes: true },
  })

  const startNode = flow.nodes.find(n => n.type === "MESSAGE")
  const updated = await db.flow.update({
    where:   { id: flow.id },
    data:    { startNodeId: startNode?.id },
    include: { nodes: true },
  })

  revalidatePath("/settings/flows")
  return { success: true as const, data: updated }
}

// #7 — DFS cycle detection: returns true if nodes contain a circular reference
function hasCycle(nodes: z.infer<typeof NodeSchema>[]): boolean {
  type FlowButton = { nextNodeId?: string | null }
  const adj = new Map<string, string[]>()
  for (const n of nodes) {
    const buttons = (n.buttons ?? []) as FlowButton[]
    adj.set(n.id, buttons.map(b => b.nextNodeId).filter(Boolean) as string[])
  }
  const visited  = new Set<string>()
  const inStack  = new Set<string>()
  function dfs(id: string): boolean {
    if (inStack.has(id)) return true
    if (visited.has(id))  return false
    visited.add(id)
    inStack.add(id)
    for (const next of adj.get(id) ?? []) { if (dfs(next)) return true }
    inStack.delete(id)
    return false
  }
  return nodes.some(n => !visited.has(n.id) && dfs(n.id))
}

export async function saveFlow(flowId: string, nodes: z.infer<typeof NodeSchema>[], startNodeId: string | null) {
  const guard = await requirePermission("hermes_ai", "configure")
  if (!guard.authorized) return unauthorizedResponse(guard.error)

  const parsedNodes = z.array(NodeSchema).safeParse(nodes)
  if (!parsedNodes.success) return { success: false as const, error: "Datos de flujo inválidos" }

  // #7 — Reject if the graph has a cycle (would cause infinite loop in WhatsApp)
  if (hasCycle(parsedNodes.data)) {
    return { success: false as const, error: "El flujo tiene una referencia circular entre nodos. Revisa las conexiones para evitar loops infinitos." }
  }

  const flow = await db.flow.findFirst({ where: { id: flowId, clinicId: guard.user.clinicId } })
  if (!flow) return { success: false as const, error: "Flujo no encontrado" }

  const incomingIds = parsedNodes.data.map(n => n.id)

  await db.$transaction([
    db.flowNode.deleteMany({ where: { flowId, id: { notIn: incomingIds } } }),
    ...parsedNodes.data.map(n => db.flowNode.upsert({
      where:  { id: n.id },
      update: { type: n.type, text: n.text, mediaUrl: n.mediaUrl, mediaType: n.mediaType, buttons: n.buttons, positionX: n.positionX, positionY: n.positionY },
      create: { id: n.id, flowId, type: n.type, text: n.text, mediaUrl: n.mediaUrl, mediaType: n.mediaType, buttons: n.buttons, positionX: n.positionX, positionY: n.positionY },
    })),
    db.flow.update({ where: { id: flowId }, data: { startNodeId } }),
  ])

  revalidatePath("/settings/flows")
  return { success: true as const }
}

export async function deleteFlow(flowId: string) {
  const guard = await requirePermission("hermes_ai", "configure")
  if (!guard.authorized) return unauthorizedResponse(guard.error)

  const flow = await db.flow.findFirst({ where: { id: flowId, clinicId: guard.user.clinicId } })
  if (!flow) return { success: false as const, error: "Flujo no encontrado" }

  const clinic = await db.clinic.findUnique({ where: { id: guard.user.clinicId }, select: { captadorConfig: true } })
  const config = (clinic?.captadorConfig as Record<string, unknown> | null) ?? {}
  if (config.flowId === flowId) {
    await db.clinic.update({
      where: { id: guard.user.clinicId },
      data:  { captadorConfig: { ...config, flowId: null } },
    })
  }

  await db.flow.delete({ where: { id: flowId } })

  revalidatePath("/settings/flows")
  revalidatePath("/settings/assistant")
  return { success: true as const }
}

export async function uploadFlowAsset(flowId: string, formData: FormData) {
  const guard = await requirePermission("hermes_ai", "configure")
  if (!guard.authorized) return unauthorizedResponse(guard.error)

  const flow = await db.flow.findFirst({ where: { id: flowId, clinicId: guard.user.clinicId } })
  if (!flow) return { success: false as const, error: "Flujo no encontrado" }

  const file = formData.get("file")
  if (!(file instanceof File) || file.size === 0) return { success: false as const, error: "Selecciona un archivo" }

  const mediaType = file.type.startsWith("image/") ? "image" as const
    : file.type.startsWith("video/") ? "video" as const
    : "document" as const

  if (file.size > FLOW_MEDIA_MAX_BYTES[mediaType]) {
    const limitMb = FLOW_MEDIA_MAX_BYTES[mediaType] / (1024 * 1024)
    return { success: false as const, error: `El archivo supera el límite de ${limitMb}MB para este tipo` }
  }

  const blob = await put(`flows/${guard.user.clinicId}/${flowId}/${Date.now()}-${file.name}`, file, { access: "public" })

  return { success: true as const, data: { url: blob.url, mediaType } }
}

export async function deleteFlowAsset(url: string) {
  const guard = await requirePermission("hermes_ai", "configure")
  if (!guard.authorized) return unauthorizedResponse(guard.error)

  try { await del(url) } catch (err) { console.error("[deleteFlowAsset]", err) }
  return { success: true as const }
}
