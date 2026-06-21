"use server"

import { requirePermission, unauthorizedResponse } from "@/lib/rbac/guards"
import { db } from "@/lib/db"

const STAGE_LABELS: Record<string, string> = {
  CONEXION:           "Conexión",
  INDAGACION:         "Indagación",
  CONSTRUCCION_VALOR: "Construcción de valor",
  MANEJO_OBJECIONES:  "Manejo de objeciones",
  CIERRE_SUAVE:       "Cierre suave",
  LISTO_PARA_HUMANO:  "Listo para humano",
}

const STAGE_PROGRESS: Record<string, number> = {
  CONEXION: 15, INDAGACION: 35, CONSTRUCCION_VALOR: 60,
  MANEJO_OBJECIONES: 75, CIERRE_SUAVE: 90, LISTO_PARA_HUMANO: 100,
}

export async function getProspectProfile(leadId: string) {
  const guard = await requirePermission("pipeline", "view")
  if (!guard.authorized) return unauthorizedResponse(guard.error)

  const lead = await db.lead.findUnique({ where: { id: leadId }, select: { clinicId: true } })
  if (!lead || lead.clinicId !== guard.user.clinicId) return { success: false as const, error: "Lead no encontrado" }

  const conv = await db.agentConversation.findUnique({
    where:  { leadId },
    select: {
      salesStage: true, rapportScore: true, detectedNeeds: true, objections: true,
      emotionalState: true, status: true,
    },
  })
  if (!conv) return { success: true as const, data: null }

  return {
    success: true as const,
    data: {
      stageLabel:    STAGE_LABELS[conv.salesStage] ?? conv.salesStage,
      progressPct:   STAGE_PROGRESS[conv.salesStage] ?? 0,
      rapportScore:  conv.rapportScore,
      needs:         conv.detectedNeeds as string[],
      objections:    conv.objections as { text: string; resolved: boolean }[],
      emotionalState: conv.emotionalState,
      handedOff:     conv.status === "HANDED_OFF",
    },
  }
}
