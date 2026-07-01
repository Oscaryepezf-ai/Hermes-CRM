"use server"

import { z } from "zod"
import { db } from "@/lib/db"
import { requirePermission, unauthorizedResponse } from "@/lib/rbac/guards"
import { revalidatePath } from "next/cache"
import type { BudgetStatus } from "@prisma/client"

const ItemSchema = z.object({
  serviceId:   z.string().nullable(),
  description: z.string().min(1).max(200),
  quantity:    z.number().int().min(1),
  unitPrice:   z.number().min(0),
  discount:    z.number().min(0).max(100),
})

const BudgetDataSchema = z.object({
  leadId:      z.string().min(1),
  doctorId:    z.string().nullable(),
  validUntil:  z.string().nullable(),
  notes:       z.string().max(1000).nullable(),
  discountPct: z.number().min(0).max(100),
  items:       z.array(ItemSchema).min(1).max(30),
})

function computeTotals(items: z.infer<typeof ItemSchema>[], discountPct: number) {
  const subtotal = items.reduce((acc, it) => {
    const lineTotal = it.quantity * it.unitPrice * (1 - it.discount / 100)
    return acc + lineTotal
  }, 0)
  const total = subtotal * (1 - discountPct / 100)
  return { subtotal, total }
}

export async function getBudgets(leadId: string) {
  const guard = await requirePermission("patients", "view")
  if (!guard.authorized) return unauthorizedResponse(guard.error)

  const lead = await db.lead.findUnique({ where: { id: leadId }, select: { clinicId: true } })
  if (!lead || lead.clinicId !== guard.user.clinicId) return { success: false as const, error: "Lead no encontrado" }

  const budgets = await db.budget.findMany({
    where:   { leadId, clinicId: guard.user.clinicId },
    include: { items: { include: { service: { select: { name: true, category: true } } } }, doctor: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  })
  return { success: true as const, data: budgets }
}

export async function createBudget(data: z.infer<typeof BudgetDataSchema>) {
  const guard = await requirePermission("patients", "edit")
  if (!guard.authorized) return unauthorizedResponse(guard.error)

  const parsed = BudgetDataSchema.safeParse(data)
  if (!parsed.success) return { success: false as const, error: "Datos inválidos" }

  const lead = await db.lead.findUnique({ where: { id: parsed.data.leadId }, select: { clinicId: true } })
  if (!lead || lead.clinicId !== guard.user.clinicId) return { success: false as const, error: "Lead no encontrado" }

  const lastBudget = await db.budget.findFirst({
    where:   { clinicId: guard.user.clinicId },
    orderBy: { number: "desc" },
    select:  { number: true },
  })
  const number = (lastBudget?.number ?? 0) + 1
  const { subtotal, total } = computeTotals(parsed.data.items, parsed.data.discountPct)

  const budget = await db.budget.create({
    data: {
      number,
      leadId:      parsed.data.leadId,
      clinicId:    guard.user.clinicId,
      doctorId:    parsed.data.doctorId,
      validUntil:  parsed.data.validUntil ? new Date(parsed.data.validUntil) : null,
      notes:       parsed.data.notes,
      discountPct: parsed.data.discountPct,
      subtotal,
      total,
      items: {
        create: parsed.data.items.map(it => ({
          serviceId:   it.serviceId,
          description: it.description,
          quantity:    it.quantity,
          unitPrice:   it.unitPrice,
          discount:    it.discount,
          total:       it.quantity * it.unitPrice * (1 - it.discount / 100),
        })),
      },
    },
  })

  revalidatePath(`/patients/${parsed.data.leadId}`)
  return { success: true as const, data: budget }
}

export async function updateBudget(budgetId: string, data: z.infer<typeof BudgetDataSchema>) {
  const guard = await requirePermission("patients", "edit")
  if (!guard.authorized) return unauthorizedResponse(guard.error)

  const existing = await db.budget.findUnique({ where: { id: budgetId }, select: { clinicId: true, status: true, leadId: true } })
  if (!existing || existing.clinicId !== guard.user.clinicId) return { success: false as const, error: "Presupuesto no encontrado" }
  if (existing.status !== "BORRADOR") return { success: false as const, error: "Solo se puede editar un presupuesto en borrador" }

  const parsed = BudgetDataSchema.safeParse(data)
  if (!parsed.success) return { success: false as const, error: "Datos inválidos" }

  const { subtotal, total } = computeTotals(parsed.data.items, parsed.data.discountPct)

  await db.$transaction([
    db.budgetItem.deleteMany({ where: { budgetId } }),
    db.budget.update({
      where: { id: budgetId },
      data: {
        doctorId:    parsed.data.doctorId,
        validUntil:  parsed.data.validUntil ? new Date(parsed.data.validUntil) : null,
        notes:       parsed.data.notes,
        discountPct: parsed.data.discountPct,
        subtotal,
        total,
        items: {
          create: parsed.data.items.map(it => ({
            serviceId:   it.serviceId,
            description: it.description,
            quantity:    it.quantity,
            unitPrice:   it.unitPrice,
            discount:    it.discount,
            total:       it.quantity * it.unitPrice * (1 - it.discount / 100),
          })),
        },
      },
    }),
  ])

  revalidatePath(`/patients/${existing.leadId}`)
  return { success: true as const }
}

export async function updateBudgetStatus(budgetId: string, status: BudgetStatus) {
  const guard = await requirePermission("patients", "edit")
  if (!guard.authorized) return unauthorizedResponse(guard.error)

  const budget = await db.budget.findUnique({ where: { id: budgetId }, select: { clinicId: true, leadId: true } })
  if (!budget || budget.clinicId !== guard.user.clinicId) return { success: false as const, error: "Presupuesto no encontrado" }

  const updates: Record<string, unknown> = { status }
  if (status === "ENVIADO") updates.sentAt = new Date()
  if (status === "ACEPTADO") updates.acceptedAt = new Date()

  await db.budget.update({ where: { id: budgetId }, data: updates as Parameters<typeof db.budget.update>[0]["data"] })

  // Al enviar el presupuesto, actualizar el estado del lead en el Pipeline
  if (status === "ENVIADO") {
    await db.lead.update({
      where: { id: budget.leadId },
      data:  { status: "PRESUPUESTO_ENVIADO" },
    }).catch(() => {})
  }

  revalidatePath(`/patients/${budget.leadId}`)
  return { success: true as const }
}

export async function deleteBudget(budgetId: string) {
  const guard = await requirePermission("patients", "edit")
  if (!guard.authorized) return unauthorizedResponse(guard.error)

  const budget = await db.budget.findUnique({ where: { id: budgetId }, select: { clinicId: true, status: true, leadId: true } })
  if (!budget || budget.clinicId !== guard.user.clinicId) return { success: false as const, error: "Presupuesto no encontrado" }
  if (budget.status !== "BORRADOR") return { success: false as const, error: "Solo se puede eliminar un presupuesto en borrador" }

  await db.budget.delete({ where: { id: budgetId } })
  revalidatePath(`/patients/${budget.leadId}`)
  return { success: true as const }
}
