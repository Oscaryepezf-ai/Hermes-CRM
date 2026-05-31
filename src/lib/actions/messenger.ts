"use server"

import { z } from "zod"
import { requirePermission, unauthorizedResponse } from "@/lib/rbac/guards"
import { sendMessengerMessage, showMessengerTyping } from "@/lib/meta/messenger-client"
import { sendInstagramMessage } from "@/lib/meta/instagram-client"
import { getChannelAccessToken } from "@/lib/meta/lead-from-messenger"
import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"

const SendSchema = z.object({
  leadId:  z.string().cuid(),
  content: z.string().min(1).max(2000),
})

// ── Facebook Messenger ────────────────────────────────────
export async function sendMessengerReply(data: z.infer<typeof SendSchema>) {
  const guard = await requirePermission("pipeline", "edit")
  if (!guard.authorized) return unauthorizedResponse(guard.error)

  const parsed = SendSchema.safeParse(data)
  if (!parsed.success) return { success: false as const, error: "Datos inválidos" }

  const profile = await db.socialProfile.findFirst({
    where: { leadId: data.leadId, channel: "FACEBOOK" },
  })
  if (!profile) return { success: false as const, error: "Este lead no tiene perfil de Facebook" }

  const pageToken =
    (await getChannelAccessToken(guard.user.clinicId, "FACEBOOK")) ??
    process.env.FACEBOOK_PAGE_ACCESS_TOKEN ?? ""

  await showMessengerTyping(profile.externalId, pageToken)
  const result = await sendMessengerMessage(profile.externalId, data.content, pageToken)
  if (!result) return { success: false as const, error: "Error al enviar el mensaje por Messenger" }

  await db.message.create({
    data: {
      leadId:            data.leadId,
      direction:         "OUTBOUND",
      content:           data.content,
      channel:           "FACEBOOK",
      externalMessageId: result.messageId,
      status:            "SENT",
    },
  })
  await db.lead.update({ where: { id: data.leadId }, data: { lastContactAt: new Date(), lastActivityAt: new Date() } })
  revalidatePath("/pipeline")
  return { success: true as const }
}

// ── Instagram DM ──────────────────────────────────────────
export async function sendInstagramReply(data: z.infer<typeof SendSchema>) {
  const guard = await requirePermission("pipeline", "edit")
  if (!guard.authorized) return unauthorizedResponse(guard.error)

  const parsed = SendSchema.safeParse(data)
  if (!parsed.success) return { success: false as const, error: "Datos inválidos" }

  const profile = await db.socialProfile.findFirst({
    where: { leadId: data.leadId, channel: "INSTAGRAM" },
  })
  if (!profile) return { success: false as const, error: "Este lead no tiene perfil de Instagram" }

  // IG Business Account ID is stored in ClinicChannel.pageId
  const igChannel = await db.clinicChannel.findUnique({
    where:  { clinicId_channel: { clinicId: guard.user.clinicId, channel: "INSTAGRAM" } },
    select: { pageId: true, accessToken: true },
  })
  if (!igChannel?.pageId || !igChannel.accessToken) {
    return { success: false as const, error: "Instagram no está configurado en esta clínica" }
  }

  const result = await sendInstagramMessage(
    igChannel.pageId,
    profile.externalId,
    data.content,
    igChannel.accessToken
  )
  if (!result) return { success: false as const, error: "Error al enviar el mensaje por Instagram" }

  await db.message.create({
    data: {
      leadId:            data.leadId,
      direction:         "OUTBOUND",
      content:           data.content,
      channel:           "INSTAGRAM",
      externalMessageId: result.messageId,
      status:            "SENT",
    },
  })
  await db.lead.update({ where: { id: data.leadId }, data: { lastContactAt: new Date(), lastActivityAt: new Date() } })
  revalidatePath("/pipeline")
  return { success: true as const }
}

// ── Mensajes unificados de todos los canales ──────────────
export async function getUnifiedMessages(leadId: string) {
  const guard = await requirePermission("pipeline", "view")
  if (!guard.authorized) return unauthorizedResponse(guard.error)

  const messages = await db.message.findMany({
    where:   { leadId },
    orderBy: { sentAt: "asc" },
    select: {
      id: true, direction: true, content: true,
      channel: true, status: true, sentAt: true,
      externalMessageId: true,
    },
  })
  return { success: true as const, data: messages }
}

export async function getLeadChannel(leadId: string) {
  const guard = await requirePermission("pipeline", "view")
  if (!guard.authorized) return unauthorizedResponse(guard.error)

  const profile = await db.socialProfile.findFirst({
    where:   { leadId },
    select:  { channel: true },
    orderBy: { createdAt: "asc" },
  })
  return { success: true as const, data: profile?.channel ?? "WHATSAPP" }
}
