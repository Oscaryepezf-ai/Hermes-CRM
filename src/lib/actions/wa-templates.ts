"use server"

import { db } from "@/lib/db"
import { auth } from "../../../auth"
import { revalidatePath } from "next/cache"
import { WaTemplateCategory, WaHeaderType, WaTemplateStatus } from "@prisma/client"
import { submitTemplateToMeta, syncTemplateStatusFromMeta } from "@/lib/whatsapp/wa-template-api"

// ─── Types ────────────────────────────────────────────────────────────────────

export type TemplateButton = {
  type: "QUICK_REPLY" | "URL" | "PHONE_NUMBER"
  text: string
  value?: string  // URL o teléfono
}

export type TemplateUpsertData = {
  name:          string
  category:      WaTemplateCategory
  language:      string
  headerType?:   WaHeaderType | null
  headerText?:   string
  headerExample?: string
  body:          string
  bodyExamples?: string[]
  footer?:       string
  buttons?:      TemplateButton[]
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function getWaTemplates() {
  const session = await auth()
  if (!session?.user) throw new Error("No autenticado")

  return db.waTemplate.findMany({
    where:   { clinicId: session.user.clinicId },
    orderBy: { createdAt: "desc" },
  })
}

export async function getWaTemplate(id: string) {
  const session = await auth()
  if (!session?.user) throw new Error("No autenticado")

  return db.waTemplate.findFirst({
    where: { id, clinicId: session.user.clinicId },
  })
}

// ─── Create ───────────────────────────────────────────────────────────────────

export async function createWaTemplate(data: TemplateUpsertData) {
  const session = await auth()
  if (!session?.user) return { success: false, error: "No autenticado" }

  const nameClean = data.name.trim().toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "")
  if (!nameClean) return { success: false, error: "Nombre inválido" }

  const existing = await db.waTemplate.findUnique({
    where: { clinicId_name: { clinicId: session.user.clinicId, name: nameClean } },
  })
  if (existing) return { success: false, error: "Ya existe una plantilla con ese nombre" }

  const tpl = await db.waTemplate.create({
    data: {
      clinicId:      session.user.clinicId,
      name:          nameClean,
      category:      data.category,
      language:      data.language,
      headerType:    data.headerType ?? null,
      headerText:    data.headerText ?? null,
      headerExample: data.headerExample ?? null,
      body:          data.body,
      bodyExamples:  data.bodyExamples ?? [],
      footer:        data.footer ?? null,
      buttons:       (data.buttons ?? []) as any,
      status:        "BORRADOR",
    },
  })

  revalidatePath("/settings/plantillas")
  return { success: true, id: tpl.id }
}

// ─── Update ───────────────────────────────────────────────────────────────────

export async function updateWaTemplate(id: string, data: TemplateUpsertData) {
  const session = await auth()
  if (!session?.user) return { success: false, error: "No autenticado" }

  const tpl = await db.waTemplate.findFirst({
    where: { id, clinicId: session.user.clinicId },
  })
  if (!tpl) return { success: false, error: "Plantilla no encontrada" }
  if (tpl.status === "EN_REVISION") return { success: false, error: "No se puede editar mientras está en revisión" }
  if (tpl.status === "APROBADA")    return { success: false, error: "Las plantillas aprobadas no se pueden editar. Duplícala primero." }

  await db.waTemplate.update({
    where: { id },
    data: {
      category:      data.category,
      language:      data.language,
      headerType:    data.headerType ?? null,
      headerText:    data.headerText ?? null,
      headerExample: data.headerExample ?? null,
      body:          data.body,
      bodyExamples:  data.bodyExamples ?? [],
      footer:        data.footer ?? null,
      buttons:       (data.buttons ?? []) as any,
      status:        "BORRADOR",
      metaId:        null,
      metaStatus:    null,
      rejectionReason: null,
    },
  })

  revalidatePath("/settings/plantillas")
  return { success: true }
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export async function deleteWaTemplate(id: string) {
  const session = await auth()
  if (!session?.user) return { success: false, error: "No autenticado" }

  const tpl = await db.waTemplate.findFirst({
    where: { id, clinicId: session.user.clinicId },
  })
  if (!tpl) return { success: false, error: "No encontrada" }
  if (tpl.status === "EN_REVISION") return { success: false, error: "No se puede eliminar mientras está en revisión" }

  await db.waTemplate.delete({ where: { id } })
  revalidatePath("/settings/plantillas")
  return { success: true }
}

// ─── Submit to Meta ───────────────────────────────────────────────────────────

export async function submitWaTemplate(id: string) {
  const session = await auth()
  if (!session?.user) return { success: false, error: "No autenticado" }

  const tpl = await db.waTemplate.findFirst({
    where:   { id, clinicId: session.user.clinicId },
    include: { clinic: { include: { channels: true } } },
  })
  if (!tpl) return { success: false, error: "Plantilla no encontrada" }
  if (tpl.status === "APROBADA")    return { success: false, error: "Ya está aprobada" }
  if (tpl.status === "EN_REVISION") return { success: false, error: "Ya está en revisión" }

  // Validaciones básicas antes de enviar
  if (!tpl.body.trim()) return { success: false, error: "El cuerpo de la plantilla es obligatorio" }

  const waChannel = tpl.clinic.channels.find(c => c.channel === "WHATSAPP")
  if (!waChannel?.accessToken || !waChannel?.pageId) {
    return { success: false, error: "Configura el canal de WhatsApp en Ajustes → Canales primero" }
  }

  const result = await submitTemplateToMeta(tpl as any, waChannel.pageId, waChannel.accessToken)

  if (!result.success) {
    return { success: false, error: result.error }
  }

  await db.waTemplate.update({
    where: { id },
    data: {
      status:      "EN_REVISION",
      metaId:      result.metaId,
      metaStatus:  "PENDING",
      submittedAt: new Date(),
    },
  })

  revalidatePath("/settings/plantillas")
  return { success: true }
}

// ─── Sync status from Meta ────────────────────────────────────────────────────

export async function syncWaTemplateStatus(id: string) {
  const session = await auth()
  if (!session?.user) return { success: false, error: "No autenticado" }

  const tpl = await db.waTemplate.findFirst({
    where:   { id, clinicId: session.user.clinicId },
    include: { clinic: { include: { channels: true } } },
  })
  if (!tpl?.metaId) return { success: false, error: "Sin ID de Meta" }

  const waChannel = tpl.clinic.channels.find(c => c.channel === "WHATSAPP")
  if (!waChannel?.accessToken) return { success: false, error: "Sin credenciales de WhatsApp" }

  const result = await syncTemplateStatusFromMeta(tpl.metaId, waChannel.accessToken)
  if (!result.success) return { success: false, error: result.error }

  const newStatus: WaTemplateStatus =
    result.metaStatus === "APPROVED" ? "APROBADA" :
    result.metaStatus === "REJECTED" ? "RECHAZADA" : "EN_REVISION"

  await db.waTemplate.update({
    where: { id },
    data: {
      status:          newStatus,
      metaStatus:      result.metaStatus,
      rejectionReason: result.rejectionReason ?? null,
      approvedAt:      newStatus === "APROBADA" ? new Date() : undefined,
    },
  })

  revalidatePath("/settings/plantillas")
  return { success: true, status: newStatus }
}

// ─── Duplicate ────────────────────────────────────────────────────────────────

export async function duplicateWaTemplate(id: string) {
  const session = await auth()
  if (!session?.user) return { success: false, error: "No autenticado" }

  const tpl = await db.waTemplate.findFirst({
    where: { id, clinicId: session.user.clinicId },
  })
  if (!tpl) return { success: false, error: "No encontrada" }

  const baseName = `${tpl.name}_copia`
  let newName = baseName
  let i = 2
  while (await db.waTemplate.findUnique({ where: { clinicId_name: { clinicId: tpl.clinicId, name: newName } } })) {
    newName = `${baseName}_${i++}`
  }

  const copy = await db.waTemplate.create({
    data: {
      clinicId:      tpl.clinicId,
      name:          newName,
      category:      tpl.category,
      language:      tpl.language,
      headerType:    tpl.headerType,
      headerText:    tpl.headerText,
      headerExample: tpl.headerExample,
      body:          tpl.body,
      bodyExamples:  tpl.bodyExamples as any,
      footer:        tpl.footer,
      buttons:       tpl.buttons as any,
      status:        "BORRADOR",
    },
  })

  revalidatePath("/settings/plantillas")
  return { success: true, id: copy.id }
}
