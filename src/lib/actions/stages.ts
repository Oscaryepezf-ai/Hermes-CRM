"use server"

import { z } from "zod"
import { auth } from "../../../auth"
import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import {
  addCustomStage, renameStage, deleteStage,
  reorderStages, getClinicStages,
} from "@/lib/pipeline/stage-manager"

export async function fetchClinicStages() {
  const session = await auth()
  if (!session?.user?.clinicId) return { success: false as const, error: 'No autorizado', data: [] as never[] }

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
  const session = await auth()
  if (!session?.user?.clinicId) return { success: false as const, error: 'No autorizado' }

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
  const session = await auth()
  if (!session?.user?.clinicId) return { success: false as const, error: 'No autorizado' }

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
  const session = await auth()
  if (!session?.user?.clinicId) return { success: false as const, error: 'No autorizado' }

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
  const session = await auth()
  if (!session?.user?.clinicId) return { success: false as const, error: 'No autorizado' }

  try {
    await reorderStages({ clinicId: session.user.clinicId, stageIds })
    revalidatePath('/pipeline')
    return { success: true as const }
  } catch (err) {
    return { success: false as const, error: (err as Error).message }
  }
}

export async function toggleNewPatientBadge(leadId: string) {
  const session = await auth()
  if (!session?.user?.clinicId) return { success: false as const, error: 'No autorizado' }

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
