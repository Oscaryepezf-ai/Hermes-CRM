"use server"

import { cookies } from "next/headers"
import { auth } from "../../../auth"
import { db } from "@/lib/db"

export async function getAccessibleClinics() {
  const session = await auth()
  if (!session?.user) return []

  const clinicIds: string[] = (session.user as any).clinicIds ?? [session.user.clinicId]
  if (clinicIds.length <= 1) return []

  return db.clinic.findMany({
    where:   { id: { in: clinicIds } },
    select:  { id: true, name: true },
    orderBy: { name: "asc" },
  })
}

export async function switchClinic(targetClinicId: string) {
  const session = await auth()
  if (!session?.user) return { success: false as const, error: "No autenticado" }

  const clinicIds: string[] = (session.user as any).clinicIds ?? [session.user.clinicId]
  if (!clinicIds.includes(targetClinicId)) {
    return { success: false as const, error: "No tienes acceso a esa clínica" }
  }

  const cookieStore = await cookies()
  cookieStore.set("active_clinic_id", targetClinicId, {
    httpOnly: true,
    secure:   true,
    sameSite: "lax",
    maxAge:   60 * 60 * 24 * 30,
    path:     "/",
  })

  return { success: true as const }
}
