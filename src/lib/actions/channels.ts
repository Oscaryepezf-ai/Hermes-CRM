"use server"

import { z } from "zod"
import { requirePermission, unauthorizedResponse } from "@/lib/rbac/guards"
import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import type { MarketingChannel } from "@prisma/client"

// ── Obtener todos los canales de la clínica ──────────────
export async function getClinicChannels() {
  const guard = await requirePermission("settings", "view")
  if (!guard.authorized) return unauthorizedResponse(guard.error)

  const channels = await db.clinicChannel.findMany({
    where:   { clinicId: guard.user.clinicId },
    select: {
      id: true, channel: true, isActive: true,
      pageId: true, connectedAt: true,
      // Never expose accessToken to client
    },
  })

  return { success: true as const, data: channels }
}

// ── Conectar Facebook Messenger ──────────────────────────
const FacebookConnectSchema = z.object({
  pageId:      z.string().min(5, "Page ID requerido"),
  accessToken: z.string().min(20, "Access Token requerido"),
})

export async function connectFacebook(data: z.infer<typeof FacebookConnectSchema>) {
  const guard = await requirePermission("settings", "configure")
  if (!guard.authorized) return unauthorizedResponse(guard.error)

  const parsed = FacebookConnectSchema.safeParse(data)
  if (!parsed.success) return { success: false as const, error: parsed.error.issues[0].message }

  // Validate the token works by calling Meta Graph API
  try {
    const res = await fetch(
      `https://graph.facebook.com/v18.0/${parsed.data.pageId}?fields=name&access_token=${parsed.data.accessToken}`
    )
    if (!res.ok) {
      return { success: false as const, error: "Token o Page ID inválido. Verifica tus credenciales de Meta." }
    }
    const page = await res.json() as { name?: string; error?: { message: string } }
    if (page.error) {
      return { success: false as const, error: `Meta: ${page.error.message}` }
    }
  } catch {
    return { success: false as const, error: "No se pudo verificar el token con Meta. Intenta de nuevo." }
  }

  await db.$transaction([
    db.clinicChannel.upsert({
      where:  { clinicId_channel: { clinicId: guard.user.clinicId, channel: "FACEBOOK" } },
      create: {
        clinicId:    guard.user.clinicId,
        channel:     "FACEBOOK",
        isActive:    true,
        pageId:      parsed.data.pageId,
        accessToken: parsed.data.accessToken,
        connectedAt: new Date(),
      },
      update: {
        isActive:    true,
        pageId:      parsed.data.pageId,
        accessToken: parsed.data.accessToken,
        connectedAt: new Date(),
      },
    }),
    db.clinic.update({
      where: { id: guard.user.clinicId },
      data:  { facebookPageId: parsed.data.pageId, messengerActive: true },
    }),
  ])

  revalidatePath("/settings/channels")
  return { success: true as const, message: "Facebook Messenger conectado correctamente" }
}

// ── Desconectar un canal ─────────────────────────────────
export async function disconnectChannel(channel: MarketingChannel) {
  const guard = await requirePermission("settings", "configure")
  if (!guard.authorized) return unauthorizedResponse(guard.error)

  await db.clinicChannel.updateMany({
    where: { clinicId: guard.user.clinicId, channel },
    data:  { isActive: false, accessToken: null },
  })

  if (channel === "FACEBOOK") {
    await db.clinic.update({
      where: { id: guard.user.clinicId },
      data:  { messengerActive: false },
    })
  }

  revalidatePath("/settings/channels")
  return { success: true as const }
}

// ── Obtener token de un canal (solo server-side) ─────────
export async function getChannelToken(
  clinicId: string,
  channel:  MarketingChannel
): Promise<string | null> {
  const record = await db.clinicChannel.findUnique({
    where:  { clinicId_channel: { clinicId, channel } },
    select: { accessToken: true, isActive: true },
  })
  if (!record?.isActive) return null
  return record.accessToken
}
