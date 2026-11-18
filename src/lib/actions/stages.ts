"use server"

import { z } from "zod"
import { requirePermission } from '@/lib/rbac/guards'
import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import {
  addCustomStage, renameStage, deleteStage,
  reorderStages, getClinicStages,
} from "@/lib/pipeline/stage-manager"

export async function fetchClinicStages() {
  const guard = await requirePermission('pipeline', 'view')
  if (!guard.authorized) return { success: false as const, error: guard.error, data: [] as never[] }
  const session = { user: guard.user }

  const stages = await getClinicStages(session.user.clinicId)
  return { success: true as const, data: stages }
}

const AddStageSchema = z.object({
  name:             z.string().min(2).max(40),
  color:            z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  bgColor:          z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  headerBgColor:    z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  insertAfterOrder: z.number().int().min(0),
})

export async function createCustomStage(data: z.infer<typeof AddStageSchema>) {
  const guard = await requirePermission('settings', 'configure')
  if (!guard.authorized) return { success: false as const, error: guard.error }
  const session = { user: guard.user }

  const parsed = AddStageSchema.safeParse(data)
  if (!parsed.success) return { success: false as const, error: 'Datos inválidos' }

  try {
    await addCustomStage({ clinicId: session.user.clinicId, ...parsed.data })
    revalidatePath('/pipeline')
    revalidatePath('/settings/pipeline')
    return { success: true as const }
  } catch (err) {
    return { success: false as const, error: (err as Error).message }
  }
}

export async function renameClinicStage(stageId: string, newName: string) {
  const guard = await requirePermission('settings', 'configure')
  if (!guard.authorized) return { success: false as const, error: guard.error }
  const session = { user: guard.user }

  if (!newName || newName.length < 2 || newName.length > 40) {
    return { success: false as const, error: 'El nombre debe tener entre 2 y 40 caracteres' }
  }

  try {
    await renameStage({ stageId, clinicId: session.user.clinicId, newName })
    revalidatePath('/pipeline')
    return { success: true as const }
  } catch (err) {
    return { success: false as const, error: (err as Error).message }
  }
}

export async function deleteClinicStage(stageId: string, moveLeadsToId: string) {
  const guard = await requirePermission('settings', 'configure')
  if (!guard.authorized) return { success: false as const, error: guard.error }
  const session = { user: guard.user }

  try {
    await deleteStage({ stageId, clinicId: session.user.clinicId, moveLeadsToId })
    revalidatePath('/pipeline')
    revalidatePath('/settings/pipeline')
    return { success: true as const }
  } catch (err) {
    return { success: false as const, error: (err as Error).message }
  }
}

export async function reorderClinicStages(stageIds: string[]) {
  const guard = await requirePermission('settings', 'configure')
  if (!guard.authorized) return { success: false as const, error: guard.error }
  const session = { user: guard.user }

  try {
    await reorderStages({ clinicId: session.user.clinicId, stageIds })
    revalidatePath('/pipeline')
    return { success: true as const }
  } catch (err) {
    return { success: false as const, error: (err as Error).message }
  }
}

export async function toggleNewPatientBadge(leadId: string) {
  const guard = await requirePermission('pipeline', 'edit')
  if (!guard.authorized) return { success: false as const, error: guard.error }
  const session = { user: guard.user }

  const lead = await db.lead.findUnique({ where: { id: leadId } })
  if (!lead || lead.clinicId !== session.user.clinicId) {
    return { success: false as const, error: 'Lead no encontrado' }
  }

  await db.lead.update({
    where: { id: leadId },
    data:  { isNewPatientOfMonth: !lead.isNewPatientOfMonth },
  })

  revalidatePath('/pipeline')
  return { success: true as const }
}
