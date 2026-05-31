"use server"

import { z } from "zod"
import { requirePermission, unauthorizedResponse } from "@/lib/rbac/guards"
import { transitionLead, convertLeadToPatient } from "@/lib/journey/transitions"
import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import type { JourneyState } from "@prisma/client"

export async function advanceLeadState(
  leadId:  string,
  toState: JourneyState,
  note?:   string,
  metadata?: Record<string, unknown>
) {
  const guard = await requirePermission("pipeline", "edit")
  if (!guard.authorized) return unauthorizedResponse(guard.error)

  const result = await transitionLead({ leadId, toState, user: guard.user, note, metadata })
  if (result.success) revalidatePath("/pipeline")
  return result
}

const LostSchema = z.object({
  leadId:     z.string().cuid(),
  lostReason: z.enum([
    "PRECIO_ALTO", "ELIGIO_OTRA", "NO_RESPONDE",
    "NO_NECESITA", "MALA_EXPERIENCIA", "OTRO",
  ]),
  note: z.string().optional(),
})

export async function markLeadAsLost(data: z.infer<typeof LostSchema>) {
  const guard = await requirePermission("pipeline", "edit")
  if (!guard.authorized) return unauthorizedResponse(guard.error)

  const parsed = LostSchema.safeParse(data)
  if (!parsed.success) return { success: false as const, error: "Datos inválidos" }

  const result = await transitionLead({
    leadId:   data.leadId,
    toState:  "PERDIDO",
    user:     guard.user,
    note:     data.note,
    metadata: { lostReason: data.lostReason },
  })

  if (result.success) revalidatePath("/pipeline")
  return result
}

const ConvertSchema = z.object({
  leadId:          z.string().cuid(),
  conversionValue: z.number().min(0),
  note:            z.string().optional(),
})

export async function convertLead(data: z.infer<typeof ConvertSchema>) {
  const guard = await requirePermission("pipeline", "edit")
  if (!guard.authorized) return unauthorizedResponse(guard.error)

  const parsed = ConvertSchema.safeParse(data)
  if (!parsed.success) return { success: false as const, error: "Datos inválidos" }

  const result = await convertLeadToPatient({
    leadId:          data.leadId,
    user:            guard.user,
    conversionValue: data.conversionValue,
    note:            data.note,
  })

  if (result.success) revalidatePath("/pipeline")
  return result
}

export async function getLeadJourney(leadId: string) {
  const guard = await requirePermission("pipeline", "view")
  if (!guard.authorized) return unauthorizedResponse(guard.error)

  const lead = await db.lead.findUnique({
    where: { id: leadId },
    include: {
      journeyEvents: {
        orderBy: { createdAt: "asc" },
        include: {
          user: { select: { name: true, role: true, avatarUrl: true } },
        },
      },
      clinicalHistory: true,
      socialProfiles: {
        select: { channel: true, displayName: true, profilePicUrl: true },
        orderBy: { createdAt: "asc" },
      },
      messages: {
        orderBy: { sentAt: "desc" },
        take:    1,
        select:  { content: true, sentAt: true, direction: true },
      },
    },
  })

  if (!lead) return { success: false as const, error: "Lead no encontrado" }
  if (lead.clinicId !== guard.user.clinicId) {
    return { success: false as const, error: "No autorizado" }
  }

  return { success: true as const, data: lead }
}

export async function logJourneyEvent(params: {
  leadId: string
  type:   "CALL_MADE" | "CLINICAL_NOTE_ADDED"
  note:   string
}) {
  const guard = await requirePermission("pipeline", "edit")
  if (!guard.authorized) return unauthorizedResponse(guard.error)

  await db.journeyEvent.create({
    data: {
      leadId: params.leadId,
      userId: guard.user.id,
      type:   params.type,
      note:   params.note,
    },
  })

  await db.lead.update({
    where: { id: params.leadId },
    data: {
      lastActivityAt:   new Date(),
      totalTouchpoints: { increment: 1 },
    },
  })

  revalidatePath("/pipeline")
  return { success: true as const }
}
