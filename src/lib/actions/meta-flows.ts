"use server"

import { db } from "@/lib/db"
import { auth } from "../../../auth"
import { revalidatePath } from "next/cache"
import { createMetaFlow, uploadFlowAsset, publishMetaFlow, getMetaFlowStatus, sendFlowMessage } from "@/lib/whatsapp/meta-flows-api"
import type { MetaFlowCategory } from "@prisma/client"
import { randomUUID } from "crypto"

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function getMetaFlows() {
  const session = await auth()
  if (!session?.user) throw new Error("No autenticado")
  return db.metaFlow.findMany({
    where:   { clinicId: session.user.clinicId },
    include: { _count: { select: { submissions: true } } },
    orderBy: { createdAt: "desc" },
  })
}

export async function getMetaFlowSubmissions(flowId: string) {
  const session = await auth()
  if (!session?.user) throw new Error("No autenticado")
  return db.metaFlowSubmission.findMany({
    where:   { flowId, clinicId: session.user.clinicId },
    include: { lead: { select: { fullName: true, phone: true } } },
    orderBy: { receivedAt: "desc" },
    take:    50,
  })
}

// ─── Create + deploy to Meta ──────────────────────────────────────────────────

export async function createAndDeployFlow(data: {
  name:        string
  description?: string
  category:    MetaFlowCategory
  screens:     object
}) {
  const session = await auth()
  if (!session?.user) return { success: false, error: "No autenticado" }

  const clinicId = session.user.clinicId
  const clinic = await db.clinic.findUnique({
    where:   { id: clinicId },
    include: { channels: true },
  })
  const waChannel = clinic?.channels.find(c => c.channel === "WHATSAPP")
  if (!waChannel?.accessToken || !waChannel?.pageId) {
    return { success: false, error: "Configura el canal de WhatsApp en Ajustes → Canales primero" }
  }

  // Mapear categoría interna → categoría de Meta
  const metaCategoryMap: Record<MetaFlowCategory, string> = {
    LEAD_QUALIFICATION:   "LEAD_GENERATION",
    APPOINTMENT_REQUEST:  "APPOINTMENT_BOOKING",
    POST_VISIT_SURVEY:    "SURVEY",
    CUSTOM:               "OTHER",
  }
  const metaCategory = metaCategoryMap[data.category]

  // 1. Crear flow en Meta
  const created = await createMetaFlow({
    wabaId:   waChannel.pageId,
    name:     data.name,
    category: metaCategory,
    token:    waChannel.accessToken,
  })
  if (!created.success) return { success: false, error: created.error }

  // 2. Guardar en BD
  const flow = await db.metaFlow.create({
    data: {
      clinicId:    clinicId,
      name:        data.name,
      description: data.description,
      category:    data.category,
      metaFlowId:  created.flowId,
      metaStatus:  "DRAFT",
      screens:     data.screens as any,
    },
  })

  // 3. Subir JSON de pantallas
  const uploaded = await uploadFlowAsset({
    flowId:  created.flowId!,
    screens: data.screens,
    token:   waChannel.accessToken,
  })
  if (!uploaded.success) {
    return { success: false, error: `Flow creado (${created.flowId}) pero el JSON falló: ${uploaded.error}` }
  }

  revalidatePath("/settings/meta-flows")
  return { success: true, flowId: flow.id, metaFlowId: created.flowId }
}

// ─── Publish ──────────────────────────────────────────────────────────────────

export async function publishFlow(id: string) {
  const session = await auth()
  if (!session?.user) return { success: false, error: "No autenticado" }

  const flow = await db.metaFlow.findFirst({
    where:   { id, clinicId: session.user.clinicId },
    include: { clinic: { include: { channels: true } } },
  })
  if (!flow?.metaFlowId) return { success: false, error: "Flow no encontrado o sin ID de Meta" }

  const waChannel = flow.clinic.channels.find(c => c.channel === "WHATSAPP")
  if (!waChannel?.accessToken) return { success: false, error: "Sin credenciales WhatsApp" }

  const result = await publishMetaFlow({ flowId: flow.metaFlowId, token: waChannel.accessToken })
  if (!result.success) return { success: false, error: result.error }

  await db.metaFlow.update({
    where: { id },
    data:  { status: "PUBLISHED", metaStatus: "PUBLISHED", publishedAt: new Date() },
  })

  revalidatePath("/settings/meta-flows")
  return { success: true }
}

// ─── Sync status from Meta ────────────────────────────────────────────────────

export async function syncFlowStatus(id: string) {
  const session = await auth()
  if (!session?.user) return { success: false, error: "No autenticado" }

  const flow = await db.metaFlow.findFirst({
    where:   { id, clinicId: session.user.clinicId },
    include: { clinic: { include: { channels: true } } },
  })
  if (!flow?.metaFlowId) return { success: false, error: "Sin ID de Meta" }

  const waChannel = flow.clinic.channels.find(c => c.channel === "WHATSAPP")
  if (!waChannel?.accessToken) return { success: false, error: "Sin credenciales" }

  const result = await getMetaFlowStatus({ flowId: flow.metaFlowId, token: waChannel.accessToken })
  if (!result.success) return { success: false, error: result.error }

  const statusMap: Record<string, "DRAFT" | "PUBLISHED" | "DEPRECATED" | "BLOCKED"> = {
    DRAFT:        "DRAFT",
    PUBLISHED:    "PUBLISHED",
    DEPRECATED:   "DEPRECATED",
    BLOCKED:      "BLOCKED",
    THROTTLED:    "BLOCKED",
  }

  await db.metaFlow.update({
    where: { id },
    data: {
      metaStatus:  result.status,
      status:      statusMap[result.status ?? "DRAFT"] ?? "DRAFT",
      publishedAt: result.status === "PUBLISHED" ? new Date() : undefined,
    },
  })

  revalidatePath("/settings/meta-flows")
  return { success: true, status: result.status, validationErrors: result.validationErrors }
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export async function deleteMetaFlow(id: string) {
  const session = await auth()
  if (!session?.user) return { success: false, error: "No autenticado" }

  const flow = await db.metaFlow.findFirst({
    where: { id, clinicId: session.user.clinicId },
  })
  if (!flow) return { success: false, error: "No encontrado" }
  if (flow.status === "PUBLISHED") return { success: false, error: "No puedes eliminar un flow publicado. Depreca primero." }

  await db.metaFlow.delete({ where: { id } })
  revalidatePath("/settings/meta-flows")
  return { success: true }
}

// ─── Send flow to a lead ──────────────────────────────────────────────────────

export async function sendFlowToLead(opts: {
  flowId:   string   // ID interno del CRM
  leadId:   string
  bodyText: string
  ctaText:  string
}) {
  const session = await auth()
  if (!session?.user) return { success: false, error: "No autenticado" }

  const [flow, lead] = await Promise.all([
    db.metaFlow.findFirst({
      where:   { id: opts.flowId, clinicId: session.user.clinicId },
      include: { clinic: { include: { channels: true } } },
    }),
    db.lead.findFirst({ where: { id: opts.leadId, clinicId: session.user.clinicId } }),
  ])

  if (!flow?.metaFlowId) return { success: false, error: "Flow no encontrado o no publicado en Meta" }
  if (flow.status !== "PUBLISHED") return { success: false, error: "El flow debe estar publicado antes de enviarlo" }
  if (!lead?.phone) return { success: false, error: "El lead no tiene número de teléfono" }

  const waChannel = flow.clinic.channels.find(c => c.channel === "WHATSAPP")
  if (!waChannel?.accessToken || !waChannel?.pageId) {
    return { success: false, error: "Canal de WhatsApp no configurado" }
  }

  const flowToken = randomUUID()
  const phone     = lead.phone.replace(/\D/g, "")

  const result = await sendFlowMessage({
    to:        phone,
    flowId:    flow.metaFlowId,
    flowToken,
    bodyText:  opts.bodyText,
    ctaText:   opts.ctaText,
    phoneId:   waChannel.pageId,
    token:     waChannel.accessToken,
  })

  if (!result.success) return { success: false, error: result.error }

  // Registrar en BD como mensaje saliente
  const conv = await db.inboxConversation.findFirst({
    where: { leadId: opts.leadId, clinicId: session.user.clinicId, channel: "WHATSAPP" },
  })
  if (conv) {
    await db.message.create({
      data: {
        leadId:    opts.leadId,
        direction: "OUTBOUND",
        content:   `[WhatsApp Flow] ${opts.bodyText}`,
        channel:   "WHATSAPP",
        status:    "SENT",
      },
    })
  }

  return { success: true, msgId: result.msgId, flowToken }
}
