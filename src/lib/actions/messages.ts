"use server"

import { z } from "zod"
import { db } from "@/lib/db"
import { auth } from "../../../auth"
import { revalidatePath } from "next/cache"
import type { ActionResponse } from "@/types"
import type { Message } from "@prisma/client"

const GetMessagesSchema = z.object({
  leadId: z.string().cuid(),
})

const SendMessageSchema = z.object({
  leadId: z.string().cuid(),
  content: z.string().min(1).max(4096),
})

async function getSession() {
  const session = await auth()
  if (!session?.user?.clinicId) throw new Error("No autorizado")
  return session
}

export async function getMessagesByLead(
  leadId: string
): Promise<ActionResponse<Message[]>> {
  try {
    const parsed = GetMessagesSchema.safeParse({ leadId })
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message }
    }

    const session = await getSession()

    const lead = await db.lead.findUnique({
      where: { id: leadId },
      select: { clinicId: true },
    })

    if (!lead || lead.clinicId !== session.user.clinicId) {
      return { success: false, error: "Lead no encontrado" }
    }

    const messages = await db.message.findMany({
      where: { leadId },
      orderBy: { sentAt: "asc" },
    })

    return { success: true, data: messages }
  } catch (error) {
    console.error("[getMessagesByLead]", error)
    return { success: false, error: "Error al obtener mensajes" }
  }
}

export async function sendMessage(
  data: z.infer<typeof SendMessageSchema>
): Promise<ActionResponse<Message>> {
  try {
    const parsed = SendMessageSchema.safeParse(data)
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message }
    }

    const session = await getSession()

    const lead = await db.lead.findUnique({
      where: { id: parsed.data.leadId },
      select: { clinicId: true },
    })

    if (!lead || lead.clinicId !== session.user.clinicId) {
      return { success: false, error: "Lead no encontrado" }
    }

    const message = await db.message.create({
      data: {
        leadId: parsed.data.leadId,
        content: parsed.data.content,
        direction: "OUTBOUND",
        status: "SENT",
      },
    })

    await db.lead.update({
      where: { id: parsed.data.leadId },
      data: { lastContactAt: new Date() },
    })

    revalidatePath("/pipeline")

    return { success: true, data: message }
  } catch (error) {
    console.error("[sendMessage]", error)
    return { success: false, error: "Error al enviar el mensaje" }
  }
}

export async function simulateInboundMessage(
  leadId: string,
  content: string
): Promise<ActionResponse<Message>> {
  if (process.env.NODE_ENV !== "development") {
    return { success: false, error: "Solo disponible en desarrollo" }
  }

  try {
    const lead = await db.lead.findUnique({
      where: { id: leadId },
      select: { clinicId: true },
    })

    if (!lead) return { success: false, error: "Lead no encontrado" }

    const message = await db.message.create({
      data: {
        leadId,
        content,
        direction: "INBOUND",
        status: "READ",
      },
    })

    await db.lead.update({
      where: { id: leadId },
      data: { lastContactAt: new Date() },
    })

    revalidatePath("/pipeline")

    return { success: true, data: message }
  } catch (error) {
    console.error("[simulateInboundMessage]", error)
    return { success: false, error: "Error al simular mensaje" }
  }
}
