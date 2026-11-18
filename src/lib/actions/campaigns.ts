"use server"

import { z } from "zod"
import { requirePermission, unauthorizedResponse } from "@/lib/rbac/guards"
import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import type { MarketingChannel } from "@prisma/client"

const GROWTH_PATH = "/crecimiento/campanas"

// ── Listar campañas de la clínica ────────────────────────
export async function getCampaigns() {
  const guard = await requirePermission("ad_spend", "view")
  if (!guard.authorized) return unauthorizedResponse(guard.error)

  const campaigns = await db.campaign.findMany({
    where: { clinicId: guard.user.clinicId },
    include: {
      dailySpend: { orderBy: { date: "desc" }, take: 30 },
      _count: { select: { leads: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  return {
    success: true as const,
    data: campaigns.map((c) => ({
      id: c.id,
      name: c.name,
      channel: c.channel,
      isActive: c.isActive,
      createdAt: c.createdAt,
      leadsCount: c._count.leads,
      last30DaysSpend: c.dailySpend.reduce((sum, s) => sum + s.spendAmount.toNumber(), 0),
      recentSpend: c.dailySpend.map((s) => ({ date: s.date, amount: s.spendAmount.toNumber() })),
    })),
  }
}

// ── Crear campaña ────────────────────────────────────────
const CreateCampaignSchema = z.object({
  name: z.string().min(2, "El nombre es obligatorio"),
  channel: z.enum(["INSTAGRAM", "FACEBOOK", "WHATSAPP", "GOOGLE", "REFERIDO", "TIKTOK", "OTRO"]),
})

export async function createCampaign(data: z.infer<typeof CreateCampaignSchema>) {
  const guard = await requirePermission("ad_spend", "create")
  if (!guard.authorized) return unauthorizedResponse(guard.error)

  const parsed = CreateCampaignSchema.safeParse(data)
  if (!parsed.success) return { success: false as const, error: parsed.error.issues[0].message }

  const campaign = await db.campaign.create({
    data: {
      clinicId: guard.user.clinicId,
      name: parsed.data.name,
      channel: parsed.data.channel as MarketingChannel,
    },
  })

  revalidatePath(GROWTH_PATH)
  return { success: true as const, data: campaign }
}

// ── Editar campaña ───────────────────────────────────────
const UpdateCampaignSchema = z.object({
  id: z.string(),
  name: z.string().min(2, "El nombre es obligatorio"),
  channel: z.enum(["INSTAGRAM", "FACEBOOK", "WHATSAPP", "GOOGLE", "REFERIDO", "TIKTOK", "OTRO"]),
})

export async function updateCampaign(data: z.infer<typeof UpdateCampaignSchema>) {
  const guard = await requirePermission("ad_spend", "edit")
  if (!guard.authorized) return unauthorizedResponse(guard.error)

  const parsed = UpdateCampaignSchema.safeParse(data)
  if (!parsed.success) return { success: false as const, error: parsed.error.issues[0].message }

  const existing = await db.campaign.findUnique({ where: { id: parsed.data.id } })
  if (!existing || existing.clinicId !== guard.user.clinicId) {
    return { success: false as const, error: "Campaña no encontrada" }
  }

  await db.campaign.update({
    where: { id: parsed.data.id },
    data: { name: parsed.data.name, channel: parsed.data.channel as MarketingChannel },
  })

  revalidatePath(GROWTH_PATH)
  return { success: true as const }
}

// ── Activar / pausar campaña ─────────────────────────────
export async function toggleCampaignActive(campaignId: string, isActive: boolean) {
  const guard = await requirePermission("ad_spend", "edit")
  if (!guard.authorized) return unauthorizedResponse(guard.error)

  const existing = await db.campaign.findUnique({ where: { id: campaignId } })
  if (!existing || existing.clinicId !== guard.user.clinicId) {
    return { success: false as const, error: "Campaña no encontrada" }
  }

  await db.campaign.update({ where: { id: campaignId }, data: { isActive } })
  revalidatePath(GROWTH_PATH)
  return { success: true as const }
}

// ── Registrar gasto diario (upsert por día) ──────────────
const LogSpendSchema = z.object({
  campaignId: z.string(),
  date: z.string(), // yyyy-MM-dd
  spendAmount: z.number().nonnegative("El gasto no puede ser negativo"),
})

export async function logDailySpend(data: z.infer<typeof LogSpendSchema>) {
  const guard = await requirePermission("ad_spend", "create")
  if (!guard.authorized) return unauthorizedResponse(guard.error)

  const parsed = LogSpendSchema.safeParse(data)
  if (!parsed.success) return { success: false as const, error: parsed.error.issues[0].message }

  const campaign = await db.campaign.findUnique({ where: { id: parsed.data.campaignId } })
  if (!campaign || campaign.clinicId !== guard.user.clinicId) {
    return { success: false as const, error: "Campaña no encontrada" }
  }

  const date = new Date(`${parsed.data.date}T00:00:00Z`)

  await db.dailyAdSpend.upsert({
    where: { campaignId_date: { campaignId: parsed.data.campaignId, date } },
    create: { campaignId: parsed.data.campaignId, date, spendAmount: parsed.data.spendAmount },
    update: { spendAmount: parsed.data.spendAmount },
  })

  revalidatePath(GROWTH_PATH)
  revalidatePath("/crecimiento")
  return { success: true as const }
}

// ── Eliminar un registro de gasto diario ─────────────────
export async function deleteDailySpend(id: string) {
  const guard = await requirePermission("ad_spend", "delete")
  if (!guard.authorized) return unauthorizedResponse(guard.error)

  const row = await db.dailyAdSpend.findUnique({
    where: { id },
    select: { campaign: { select: { clinicId: true } } },
  })
  if (!row || row.campaign.clinicId !== guard.user.clinicId) {
    return { success: false as const, error: "Registro no encontrado" }
  }

  await db.dailyAdSpend.delete({ where: { id } })
  revalidatePath(GROWTH_PATH)
  revalidatePath("/crecimiento")
  return { success: true as const }
}
