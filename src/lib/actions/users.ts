"use server"

import { z } from "zod"
import { db } from "@/lib/db"
import { requirePermission, unauthorizedResponse } from "@/lib/rbac/guards"
import { revalidatePath } from "next/cache"
import { addHours } from "date-fns"

export async function getClinicUsers() {
  const guard = await requirePermission("users", "view")
  if (!guard.authorized) return unauthorizedResponse(guard.error)

  const users = await db.user.findMany({
    where: { clinicId: guard.user.clinicId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      avatarUrl: true,
      lastLoginAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  })

  return { success: true as const, data: users }
}

const InviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(["ADMIN", "DOCTOR", "RECEPTIONIST"]),
  name: z.string().min(2).max(80),
})

export async function inviteUser(data: z.infer<typeof InviteSchema>) {
  const guard = await requirePermission("users", "create")
  if (!guard.authorized) return unauthorizedResponse(guard.error)

  const parsed = InviteSchema.safeParse(data)
  if (!parsed.success) return { success: false as const, error: "Datos inválidos" }

  const existing = await db.user.findFirst({
    where: { email: data.email, clinicId: guard.user.clinicId },
  })
  if (existing) {
    return { success: false as const, error: "Este email ya está registrado en tu clínica" }
  }

  const invitation = await db.userInvitation.create({
    data: {
      email: data.email,
      role: data.role,
      clinicId: guard.user.clinicId,
      invitedById: guard.user.id,
      expiresAt: addHours(new Date(), 48),
    },
  })

  revalidatePath("/settings/users")
  return { success: true as const, data: { invitationId: invitation.id, token: invitation.token } }
}

export async function updateUserRole(
  userId: string,
  newRole: "ADMIN" | "DOCTOR" | "RECEPTIONIST"
) {
  const guard = await requirePermission("users", "edit")
  if (!guard.authorized) return unauthorizedResponse(guard.error)

  if (userId === guard.user.id) {
    return { success: false as const, error: "No puedes cambiar tu propio rol" }
  }

  const user = await db.user.findFirst({
    where: { id: userId, clinicId: guard.user.clinicId },
  })
  if (!user) return { success: false as const, error: "Usuario no encontrado" }

  await db.user.update({ where: { id: userId }, data: { role: newRole } })

  revalidatePath("/settings/users")
  return { success: true as const }
}

export async function toggleUserStatus(userId: string, isActive: boolean) {
  const guard = await requirePermission("users", "edit")
  if (!guard.authorized) return unauthorizedResponse(guard.error)

  if (userId === guard.user.id) {
    return { success: false as const, error: "No puedes desactivar tu propia cuenta" }
  }

  const user = await db.user.findFirst({
    where: { id: userId, clinicId: guard.user.clinicId },
  })
  if (!user) return { success: false as const, error: "Usuario no encontrado" }

  await db.user.update({ where: { id: userId }, data: { isActive } })

  revalidatePath("/settings/users")
  return { success: true as const }
}
