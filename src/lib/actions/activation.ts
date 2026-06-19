"use server"

import { requirePermission, unauthorizedResponse } from "@/lib/rbac/guards"
import { getActivationChecklist, claimReward } from "@/lib/onboarding/activation-checklist"

export async function getMyActivationChecklist() {
  const guard = await requirePermission("dashboard", "view")
  if (!guard.authorized) return unauthorizedResponse(guard.error)

  const checklist = await getActivationChecklist(guard.user.clinicId)
  return { success: true as const, data: checklist }
}

export async function claimMyReward() {
  const guard = await requirePermission("dashboard", "view")
  if (!guard.authorized) return unauthorizedResponse(guard.error)

  const result = await claimReward(guard.user.clinicId)
  if (!result.success) return { success: false as const, error: "La recompensa no está disponible todavía" }
  return { success: true as const }
}
