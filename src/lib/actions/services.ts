"use server"

import { z } from "zod"
import { requirePermission, unauthorizedResponse } from "@/lib/rbac/guards"
import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"

const ServiceSchema = z.object({
  name: z.string().min(2).max(100),
  category: z.enum(["ORTODONCIA", "IMPLANTES", "BLANQUEAMIENTO", "ENDODONCIA", "LIMPIEZA", "CIRUGIA", "PROTESIS", "OTRO"]),
  defaultPrice: z.number().positive(),
})

export async function createService(data: z.infer<typeof ServiceSchema>) {
  const guard = await requirePermission("settings", "configure")
  if (!guard.authorized) return unauthorizedResponse(guard.error)

  const parsed = ServiceSchema.safeParse(data)
  if (!parsed.success) return { success: false, error: "Datos inválidos" }

  const existing = await db.service.findUnique({
    where: { clinicId_name: { clinicId: guard.user.clinicId, name: parsed.data.name } },
  })
  if (existing) return { success: false, error: "Ya existe un servicio con ese nombre" }

  await db.service.create({
    data: { clinicId: guard.user.clinicId, ...parsed.data },
  })

  revalidatePath("/reportes/servicios-vendidos")
  return { success: true }
}

export async function getClinicServices() {
  const guard = await requirePermission("reports", "view")
  if (!guard.authorized) return unauthorizedResponse(guard.error)

  const services = await db.service.findMany({
    where: { clinicId: guard.user.clinicId, isActive: true },
    orderBy: { name: "asc" },
  })
  return { success: true, data: services }
}

export async function getClinicDoctors() {
  const guard = await requirePermission("reports", "view")
  if (!guard.authorized) return unauthorizedResponse(guard.error)

  const doctors = await db.user.findMany({
    where: { clinicId: guard.user.clinicId, role: { in: ["ADMIN", "DOCTOR"] } },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  })
  return { success: true, data: doctors }
}
