"use server"

import { auth } from "../../../auth"
import { db } from "@/lib/db"

async function requireSuperAdmin() {
  const session = await auth()
  const user = session?.user as any
  if (!user?.id || !user?.isSuperAdmin) {
    throw new Error("Acceso denegado — solo para Super Admin")
  }
  return user
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
  await requireSuperAdmin()
  await db.user.update({ where: { id: userId }, data: { isActive } })
  return { success: true as const }
}

// ── Update clinic plan ───────────────────────────────────
export async function updateClinicPlan(clinicId: string, plan: "STARTER" | "PROFESIONAL" | "CLINICA") {
  await requireSuperAdmin()
  await db.clinic.update({ where: { id: clinicId }, data: { plan } })
  return { success: true as const }
}
