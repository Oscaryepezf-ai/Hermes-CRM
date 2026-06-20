"use server"

import { z } from "zod"
import bcrypt from "bcryptjs"
import { revalidatePath } from "next/cache"
import { auth } from "../../../auth"
import { db } from "@/lib/db"
import { slugify } from "@/lib/utils"
import { createDefaultStages } from "@/lib/pipeline/stage-manager"
import type { SuperAdminAction } from "@prisma/client"

async function requireSuperAdmin() {
  const session = await auth()
  const user = session?.user as any
  if (!user?.id || !user?.isSuperAdmin) {
    throw new Error("Acceso denegado — solo para Super Admin")
  }
  return user
}

function generateTempPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789"
  return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join("")
}

async function logAdminAction(params: {
  adminUserId: string
  action: SuperAdminAction
  targetType: "Clinic" | "User"
  targetId: string
  targetLabel: string
  metadata?: Record<string, unknown>
}) {
  await db.superAdminAuditLog.create({
    data: {
      adminUserId: params.adminUserId,
      action: params.action,
      targetType: params.targetType,
      targetId: params.targetId,
      targetLabel: params.targetLabel,
      metadata: (params.metadata ?? {}) as object,
    },
  })
}

// ── Platform overview metrics ────────────────────────────
export async function getPlatformMetrics() {
  await requireSuperAdmin()

  const [clinics, users, leads, appointments] = await Promise.all([
    db.clinic.count(),
    db.user.count({ where: { isSuperAdmin: false } }),
    db.lead.count(),
    db.appointment.count(),
  ])

  const planBreakdown = await db.clinic.groupBy({
    by:      ["plan"],
    _count:  { id: true },
  })

  const PLAN_PRICES: Record<string, number> = {
    STARTER:      49,
    PROFESIONAL:  129,
    CLINICA:      500,
  }

  const mrr = planBreakdown.reduce((sum, p) => {
    return sum + (PLAN_PRICES[p.plan] ?? 0) * p._count.id
  }, 0)

  return {
    success: true as const,
    data: { clinics, users, leads, appointments, mrr, planBreakdown },
  }
}

// ── All clinics with usage data ──────────────────────────
export async function getAllClinics() {
  await requireSuperAdmin()

  const clinics = await db.clinic.findMany({
    select: {
      id:        true,
      name:      true,
      slug:      true,
      plan:      true,
      country:   true,
      createdAt: true,
      suspendedAt: true,
      captadorActive: true,
      messengerActive: true,
      instagramActive: true,
      users: {
        where:  { isSuperAdmin: false },
        select: {
          id:          true,
          name:        true,
          email:       true,
          role:        true,
          isActive:    true,
          lastLoginAt: true,
          createdAt:   true,
          avatarUrl:   true,
        },
        orderBy: { lastLoginAt: { sort: "desc", nulls: "last" } },
      },
      _count: {
        select: {
          leads:        true,
          patients:     true,
          appointments: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  return { success: true as const, data: clinics }
}

// ── Clinic detail with full activity ────────────────────
export async function getClinicDetail(clinicId: string) {
  await requireSuperAdmin()

  const clinic = await db.clinic.findUnique({
    where: { id: clinicId },
    include: {
      users: {
        where:   { isSuperAdmin: false },
        orderBy: { lastLoginAt: { sort: "desc", nulls: "last" } },
        select: {
          id:          true,
          name:        true,
          email:       true,
          role:        true,
          isActive:    true,
          lastLoginAt: true,
          createdAt:   true,
          avatarUrl:   true,
          invitedAt:   true,
        },
      },
      leads: {
        select: { id: true, status: true, journeyState: true, createdAt: true, channel: true },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
      _count: {
        select: { leads: true, patients: true, appointments: true, users: true },
      },
    },
  })

  if (!clinic) return { success: false as const, error: "Clínica no encontrada" }

  return { success: true as const, data: clinic }
}

// ── Toggle user active status ────────────────────────────
export async function toggleUserActive(userId: string, isActive: boolean) {
  const admin = await requireSuperAdmin()
  const user = await db.user.update({ where: { id: userId }, data: { isActive } })
  await logAdminAction({
    adminUserId: admin.id,
    action: isActive ? "USER_ACTIVATED" : "USER_DEACTIVATED",
    targetType: "User",
    targetId: user.id,
    targetLabel: user.name,
  })
  return { success: true as const }
}

// ── Update clinic plan ───────────────────────────────────
export async function updateClinicPlan(clinicId: string, plan: "STARTER" | "PROFESIONAL" | "CLINICA") {
  const admin = await requireSuperAdmin()
  const clinic = await db.clinic.findUniqueOrThrow({ where: { id: clinicId } })
  await db.clinic.update({ where: { id: clinicId }, data: { plan } })
  await logAdminAction({
    adminUserId: admin.id,
    action: "CLINIC_PLAN_CHANGED",
    targetType: "Clinic",
    targetId: clinicId,
    targetLabel: clinic.name,
    metadata: { from: clinic.plan, to: plan },
  })
  return { success: true as const }
}

// ── Create a new clinic manually (post-demo onboarding) ──
const CreateClinicSchema = z.object({
  clinicName: z.string().min(2).max(100),
  country:    z.string().min(2).max(5),
  plan:       z.enum(["STARTER", "PROFESIONAL", "CLINICA"]),
  adminName:  z.string().min(2).max(80),
  adminEmail: z.string().email(),
  adminPhone: z.string().optional(),
})

export async function createClinicManually(data: z.infer<typeof CreateClinicSchema>) {
  const admin = await requireSuperAdmin()
  const parsed = CreateClinicSchema.safeParse(data)
  if (!parsed.success) return { success: false as const, error: "Datos inválidos" }

  const existing = await db.user.findUnique({ where: { email: parsed.data.adminEmail } })
  if (existing) return { success: false as const, error: "Ya existe una cuenta con ese email" }

  const baseSlug = slugify(parsed.data.clinicName)
  let slug = baseSlug
  let suffix = 1
  while (await db.clinic.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${suffix++}`
  }

  const tempPassword = generateTempPassword()
  const passwordHash = await bcrypt.hash(tempPassword, 12)

  const clinic = await db.clinic.create({
    data: {
      name: parsed.data.clinicName,
      slug,
      country: parsed.data.country,
      plan: parsed.data.plan,
      onboardingCompleted: true,
    },
  })

  await createDefaultStages(clinic.id)

  await db.user.create({
    data: {
      name: parsed.data.adminName,
      email: parsed.data.adminEmail,
      phone: parsed.data.adminPhone || undefined,
      password: passwordHash,
      role: "ADMIN",
      clinicId: clinic.id,
    },
  })

  await db.activationMission.create({
    data: { clinicId: clinic.id, missionKey: "CUENTA_CREADA", completed: true, completedAt: new Date() },
  })
  await db.activationMission.createMany({
    data: (["CREAR_CITA", "REGISTRAR_EVOLUCION"] as const).map((missionKey) => ({
      clinicId: clinic.id,
      missionKey,
    })),
  })

  await logAdminAction({
    adminUserId: admin.id,
    action: "CLINIC_CREATED",
    targetType: "Clinic",
    targetId: clinic.id,
    targetLabel: clinic.name,
    metadata: { plan: parsed.data.plan, adminEmail: parsed.data.adminEmail },
  })

  revalidatePath("/super-admin/clinics")
  return { success: true as const, clinicId: clinic.id, tempPassword }
}

// ── Change a user's role ─────────────────────────────────
export async function changeUserRole(userId: string, newRole: "ADMIN" | "DOCTOR" | "RECEPTIONIST") {
  const admin = await requireSuperAdmin()
  const user = await db.user.findUniqueOrThrow({ where: { id: userId } })
  await db.user.update({ where: { id: userId }, data: { role: newRole } })
  await logAdminAction({
    adminUserId: admin.id,
    action: "USER_ROLE_CHANGED",
    targetType: "User",
    targetId: userId,
    targetLabel: user.name,
    metadata: { from: user.role, to: newRole },
  })
  revalidatePath("/super-admin")
  return { success: true as const }
}

// ── Reset a user's password ──────────────────────────────
export async function resetUserPassword(userId: string) {
  const admin = await requireSuperAdmin()
  const user = await db.user.findUniqueOrThrow({ where: { id: userId } })
  const tempPassword = generateTempPassword()
  await db.user.update({ where: { id: userId }, data: { password: await bcrypt.hash(tempPassword, 12) } })
  await logAdminAction({
    adminUserId: admin.id,
    action: "USER_PASSWORD_RESET",
    targetType: "User",
    targetId: userId,
    targetLabel: user.name,
  })
  return { success: true as const, tempPassword }
}

// ── Suspend / reactivate an entire clinic ────────────────
export async function suspendClinic(clinicId: string, reason: string) {
  const admin = await requireSuperAdmin()
  const clinic = await db.clinic.update({
    where: { id: clinicId },
    data: { suspendedAt: new Date(), suspendedReason: reason },
  })
  await logAdminAction({
    adminUserId: admin.id,
    action: "CLINIC_SUSPENDED",
    targetType: "Clinic",
    targetId: clinicId,
    targetLabel: clinic.name,
    metadata: { reason },
  })
  revalidatePath(`/super-admin/clinics/${clinicId}`)
  return { success: true as const }
}

export async function reactivateClinic(clinicId: string) {
  const admin = await requireSuperAdmin()
  const clinic = await db.clinic.update({
    where: { id: clinicId },
    data: { suspendedAt: null, suspendedReason: null },
  })
  await logAdminAction({
    adminUserId: admin.id,
    action: "CLINIC_REACTIVATED",
    targetType: "Clinic",
    targetId: clinicId,
    targetLabel: clinic.name,
  })
  revalidatePath(`/super-admin/clinics/${clinicId}`)
  return { success: true as const }
}

// ── Global users listing across all clinics ──────────────
export async function getAllUsersAcrossClinics(search?: string) {
  await requireSuperAdmin()
  const users = await db.user.findMany({
    where: {
      isSuperAdmin: false,
      ...(search && {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
        ],
      }),
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true, name: true, email: true, role: true, isActive: true,
      createdAt: true, lastLoginAt: true, clinicId: true,
      clinic: { select: { name: true, suspendedAt: true } },
    },
  })
  return { success: true as const, data: users }
}

// ── Audit log ─────────────────────────────────────────────
export async function getAuditLog(limit = 100) {
  await requireSuperAdmin()
  const logs = await db.superAdminAuditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { adminUser: { select: { name: true } } },
  })
  return { success: true as const, data: logs }
}
