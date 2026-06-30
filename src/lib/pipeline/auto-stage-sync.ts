import { db } from '@/lib/db'

// Mueve automáticamente un lead a la etapa del Pipeline identificada por slug
// SOLO cuando captadorActive está habilitado para esa clínica.
// Nunca retrocede ni repite: solo avanza si la etapa destino tiene un
// order mayor al actual, evitando que mensajes tardíos reviertan movimientos
// ya hechos manualmente. Es un no-op silencioso si la etapa fue borrada por
// la clínica o si captadorActive está desactivado.
export async function moveLeadToStageBySlug(
  leadId:     string,
  clinicId:   string,
  targetSlug: 'contactado' | 'calificado' | 'cita_agendada' | 'convertido',
  note:       string,
): Promise<void> {
  const clinic = await db.clinic.findUnique({
    where:  { id: clinicId },
    select: { captadorActive: true },
  })
  if (!clinic?.captadorActive) return

  const [lead, targetStage] = await Promise.all([
    db.lead.findUnique({
      where:   { id: leadId },
      select:  { stageId: true, stage: { select: { name: true, order: true } } },
    }),
    db.pipelineStage.findFirst({ where: { clinicId, slug: targetSlug } }),
  ])

  if (!lead || !targetStage) return
  if (lead.stage && lead.stage.order >= targetStage.order) return

  await db.$transaction([
    db.lead.update({
      where: { id: leadId },
      data:  { stageId: targetStage.id },
    }),
    db.leadHistory.create({
      data: {
        leadId,
        userId:    null,
        fromStage: lead.stage?.name ?? null,
        toStage:   targetStage.name,
        note:      `Hermes IA — ${note}`,
      },
    }),
  ])
}
