"use server"

import { z } from "zod"
import { requirePermission, unauthorizedResponse } from "@/lib/rbac/guards"
import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import type { CaptadorConfig } from "@/lib/captador/conversation-router"

const DEFAULT_CONFIG: CaptadorConfig = {
  businessHours: { start: 8, end: 20 },
  maxTurns: 4,
  tone: "amigable",
  specialties: ["Ortodoncia", "Implantes", "Blanqueamiento", "Limpieza", "Cirugía"],
  knowledgeBase: "",
  mode: "basico",
  flowId: null,
}

export async function getCaptadorSettings() {
  const guard = await requirePermission("settings", "view")
  if (!guard.authorized) return unauthorizedResponse(guard.error)

  const clinic = await db.clinic.findUnique({
    where: { id: guard.user.clinicId },
    select: { captadorActive: true, captadorConfig: true, plan: true },
  })

  const raw = (clinic?.captadorConfig ?? {}) as Partial<CaptadorConfig>

  return {
    success: true as const,
    active: clinic?.captadorActive ?? false,
    plan: clinic?.plan ?? "STARTER",
    config: {
      businessHours: raw.businessHours ?? DEFAULT_CONFIG.businessHours,
      maxTurns: raw.maxTurns ?? DEFAULT_CONFIG.maxTurns,
      tone: raw.tone ?? DEFAULT_CONFIG.tone,
      specialties: raw.specialties ?? DEFAULT_CONFIG.specialties,
      knowledgeBase: raw.knowledgeBase ?? DEFAULT_CONFIG.knowledgeBase,
      mode: raw.mode ?? DEFAULT_CONFIG.mode,
      flowId: raw.flowId ?? DEFAULT_CONFIG.flowId,
    },
  }
}

const UpdateSchema = z.object({
  active: z.boolean(),
  config: z.object({
    businessHours: z.object({
      start: z.number().int().min(0).max(23),
      end: z.number().int().min(1).max(24),
    }),
    maxTurns: z.number().int().min(1).max(10),
    tone: z.enum(["formal", "amigable"]),
    specialties: z.array(z.string().min(1)).min(1),
    knowledgeBase: z.string().max(4000),
    mode: z.enum(["basico", "consultivo", "flujo"]),
    flowId: z.string().nullable(),
  }),
})

export async function updateCaptadorSettings(data: z.infer<typeof UpdateSchema>) {
  const guard = await requirePermission("settings", "configure")
  if (!guard.authorized) return unauthorizedResponse(guard.error)

  const parsed = UpdateSchema.safeParse(data)
  if (!parsed.success) return { success: false as const, error: parsed.error.issues[0].message }

  if (parsed.data.config.businessHours.end <= parsed.data.config.businessHours.start) {
    return { success: false as const, error: "El horario de cierre debe ser después del de apertura" }
  }

  // #8 — Validate flowId exists and belongs to this clinic when mode='flujo'
  if (parsed.data.config.mode === "flujo") {
    const flowId = parsed.data.config.flowId
    if (!flowId) return { success: false as const, error: "Debes seleccionar un flujo para el modo 'Flujo de botones'" }
    const flow = await db.flow.findFirst({ where: { id: flowId, clinicId: guard.user.clinicId } })
    if (!flow) return { success: false as const, error: "El flujo seleccionado no existe o no pertenece a esta clínica" }
  }

  await db.clinic.update({
    where: { id: guard.user.clinicId },
    data: {
      captadorActive: parsed.data.active,
      captadorConfig: parsed.data.config,
    },
  })

  revalidatePath("/settings/assistant")
  return { success: true as const }
}
