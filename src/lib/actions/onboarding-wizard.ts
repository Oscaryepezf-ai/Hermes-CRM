"use server"

import { z } from "zod"
import { db } from "@/lib/db"
import { requirePermission, unauthorizedResponse } from "@/lib/rbac/guards"
import { createDefaultStages } from "@/lib/pipeline/stage-manager"
import { revalidatePath } from "next/cache"

// ── Paso 1: Datos del negocio ────────────────────────────
const BusinessInfoSchema = z.object({
  businessName: z.string().min(2).max(100),
  practiceType: z.enum(["ODONTOLOGIA", "ORTODONCIA_ESPECIALIZADA", "RED_DENTAL", "OTRO"]),
})

export async function saveBusinessInfo(data: z.infer<typeof BusinessInfoSchema>) {
  const guard = await requirePermission("settings", "configure")
  if (!guard.authorized) return unauthorizedResponse(guard.error)

  const parsed = BusinessInfoSchema.safeParse(data)
  if (!parsed.success) return { success: false as const, error: parsed.error.issues[0].message }

  await db.clinic.update({
    where: { id: guard.user.clinicId },
    data: {
      name:           parsed.data.businessName,
      practiceType:   parsed.data.practiceType,
      onboardingStep: 1,
    },
  })

  revalidatePath("/wizard")
  return { success: true as const }
}

// ── Paso 2: Rol declarado ────────────────────────────────
const RoleSchema = z.object({
  role: z.enum(["DUENO_CONSULTORIO", "ADMINISTRADOR", "RECEPCIONISTA", "PROFESIONAL_MULTISEDE", "ESTUDIANTE", "OTRO"]),
})

export async function saveSelfReportedRole(data: z.infer<typeof RoleSchema>) {
  const guard = await requirePermission("settings", "configure")
  if (!guard.authorized) return unauthorizedResponse(guard.error)

  const parsed = RoleSchema.safeParse(data)
  if (!parsed.success) return { success: false as const, error: parsed.error.issues[0].message }

  await db.user.update({
    where: { id: guard.user.id },
    data:  { selfReportedRole: parsed.data.role },
  })

  await db.clinic.update({
    where: { id: guard.user.clinicId },
    data:  { onboardingStep: 2 },
  })

  revalidatePath("/wizard")
  return { success: true as const }
}

// ── Paso 3: Herramientas actuales ────────────────────────
const ToolsSchema = z.object({
  currentTools: z.enum(["PAPEL", "HERRAMIENTAS_SUELTAS", "SOFTWARE_ESPECIALIZADO"]),
})

export async function saveCurrentTools(data: z.infer<typeof ToolsSchema>) {
  const guard = await requirePermission("settings", "configure")
  if (!guard.authorized) return unauthorizedResponse(guard.error)

  const parsed = ToolsSchema.safeParse(data)
  if (!parsed.success) return { success: false as const, error: parsed.error.issues[0].message }

  await db.clinic.update({
    where: { id: guard.user.clinicId },
    data:  { currentTools: parsed.data.currentTools, onboardingStep: 3 },
  })

  revalidatePath("/wizard")
  return { success: true as const }
}

// ── Paso 4: Finalizar — crear etapas default + activar cuenta
export async function finalizeOnboarding() {
  const guard = await requirePermission("settings", "configure")
  if (!guard.authorized) return unauthorizedResponse(guard.error)

  const existingStages = await db.pipelineStage.count({ where: { clinicId: guard.user.clinicId } })
  if (existingStages === 0) {
    await createDefaultStages(guard.user.clinicId)
  }

  await db.clinic.update({
    where: { id: guard.user.clinicId },
    data:  { onboardingStep: 4, onboardingCompleted: true },
  })

  return { success: true as const }
}

export async function getOnboardingState() {
  const guard = await requirePermission("settings", "configure")
  if (!guard.authorized) return unauthorizedResponse(guard.error)

  const clinic = await db.clinic.findUnique({
    where:  { id: guard.user.clinicId },
    select: { onboardingStep: true, onboardingCompleted: true },
  })
  if (!clinic) return { success: false as const, error: "Clínica no encontrada" }

  return { success: true as const, data: clinic }
}
