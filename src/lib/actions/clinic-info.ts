"use server"

import { z } from "zod"
import { put } from "@vercel/blob"
import { db } from "@/lib/db"
import { requirePermission, unauthorizedResponse } from "@/lib/rbac/guards"
import { revalidatePath } from "next/cache"

const ClinicInfoSchema = z.object({
  name:    z.string().min(2).max(100),
  phone:   z.string().max(30).nullable(),
  address: z.string().max(200).nullable(),
  city:    z.string().max(80).nullable(),
})

export async function getClinicInfo() {
  const guard = await requirePermission("settings", "view")
  if (!guard.authorized) return unauthorizedResponse(guard.error)

  const clinic = await db.clinic.findUnique({
    where:  { id: guard.user.clinicId },
    select: { id: true, name: true, logoUrl: true, phone: true, address: true, city: true },
  })
  return { success: true as const, data: clinic }
}

export async function updateClinicInfo(formData: FormData) {
  const guard = await requirePermission("settings", "configure")
  if (!guard.authorized) return unauthorizedResponse(guard.error)

  const raw = {
    name:    formData.get("name") as string,
    phone:   (formData.get("phone") as string) || null,
    address: (formData.get("address") as string) || null,
    city:    (formData.get("city") as string) || null,
  }
  const parsed = ClinicInfoSchema.safeParse(raw)
  if (!parsed.success) return { success: false as const, error: "Datos inválidos" }

  const logoFile = formData.get("logo")
  let logoUrl: string | undefined

  if (logoFile instanceof File && logoFile.size > 0) {
    if (logoFile.size > 5 * 1024 * 1024) return { success: false as const, error: "El logo no puede superar 5MB" }
    const ext = logoFile.name.split(".").pop() ?? "png"
    const blob = await put(`clinics/${guard.user.clinicId}/logo.${ext}`, logoFile, { access: "public" })
    logoUrl = blob.url
  }

  await db.clinic.update({
    where: { id: guard.user.clinicId },
    data: {
      name:    parsed.data.name,
      phone:   parsed.data.phone,
      address: parsed.data.address,
      city:    parsed.data.city,
      ...(logoUrl && { logoUrl }),
    },
  })

  revalidatePath("/settings/clinica")
  return { success: true as const }
}
