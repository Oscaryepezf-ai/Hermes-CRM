"use server"

import { z } from "zod"
import { auth } from "../../../auth"
import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { getReactivationStats } from "@/lib/reactivador/segment-patients"
import { markCampaignAsConverted } from "@/lib/reactivador/response-tracker"

// ── Obtener config + stats del Reactivador ────────────────
export async function getReactivadorData() {
  const session = await auth()
  if (!session?.user?.clinicId) return { success: false, error: 'No autorizado' }

  const clinic = await db.clinic.findUnique({
    where:  { id: session.user.clinicId },
    select: { reactivadorActive: true, reactivadorConfig: true },
  })

  const stats = await getReactivationStats(session.user.clinicId)

  return {
    success: true,
    data: {
      active: clinic?.reactivadorActive ?? false,
      config: (clinic?.reactivadorConfig as Record<string, unknown>) ?? {
        inactivityDays:  90,
        maxAttempts:     3,
        daysBetweenMsgs: 7,
        incentive:       '',
        tone:            'amigable',
        channels:        ['WHATSAPP'],
      },
      stats,
    },
  }
}

// ── Guardar config del Reactivador ────────────────────────
const ConfigSchema = z.object({
  active:          z.boolean(),
  inactivityDays:  z.number().int().min(30).max(365),
  maxAttempts:     z.number().int().min(1).max(5),
  daysBetweenMsgs: z.number().int().min(3).max(30),
  incentive:       z.string().max(200).optional(),
  tone:            z.enum(['amigable', 'formal']),
  channels:        z.array(z.string()).min(1),
})

export async function saveReactivadorConfig(
  data: z.infer<typeof ConfigSchema>
) {
  const session = await auth()
  if (!session?.user?.clinicId) return { success: false, error: 'No autorizado' }

  const parsed = ConfigSchema.safeParse(data)
  if (!parsed.success) return { success: false, error: 'Datos inválidos' }

  await db.clinic.update({
    where: { id: session.user.clinicId },
    data: {
      reactivadorActive: data.active,
      reactivadorConfig: {
        inactivityDays:  data.inactivityDays,
        maxAttempts:     data.maxAttempts,
        daysBetweenMsgs: data.daysBetweenMsgs,
        incentive:       data.incentive || null,
        tone:            data.tone,
        channels:        data.channels,
      },
    },
  })

  revalidatePath('/hermes-ai')
  return { success: true }
}

// ── Obtener campañas activas/históricas ───────────────────
export async function getReactivationCampaigns(status?: string) {
  const session = await auth()
  if (!session?.user?.clinicId) return { success: false, data: [] }

  const campaigns = await db.reactivationCampaign.findMany({
    where: {
      clinicId: session.user.clinicId,
      ...(status ? { status: status as never } : {}),
    },
    include: {
      lead:     { select: { fullName: true, phone: true } },
      messages: { orderBy: { sentAt: 'desc' }, take: 1 },
    },
    orderBy: { updatedAt: 'desc' },
    take:    100,
  })

  return { success: true, data: campaigns }
}

// ── Cancelar campaña manualmente ─────────────────────────
export async function cancelCampaign(campaignId: string) {
  const session = await auth()
  if (!session?.user?.clinicId) return { success: false, error: 'No autorizado' }

  const campaign = await db.reactivationCampaign.findUnique({
    where:  { id: campaignId },
    select: { clinicId: true },
  })

  if (!campaign || campaign.clinicId !== session.user.clinicId) {
    return { success: false, error: 'No autorizado' }
  }

  await db.reactivationCampaign.update({
    where: { id: campaignId },
    data:  { status: 'CANCELLED' },
  })

  revalidatePath('/hermes-ai')
  return { success: true }
}

// ── Marcar campaña como convertida (desde el pipeline) ───
export async function registerReactivationConversion(
  leadId:  string,
  revenue: number
) {
  const session = await auth()
  if (!session?.user?.clinicId) return { success: false, error: 'No autorizado' }

  await markCampaignAsConverted(leadId, revenue)
  return { success: true }
}
