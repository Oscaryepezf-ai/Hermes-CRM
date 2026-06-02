import { db } from '@/lib/db'

export async function markCampaignAsResponded(leadId: string): Promise<void> {
  const activeCampaign = await db.reactivationCampaign.findFirst({
    where: { leadId, status: { in: ['PENDING', 'ACTIVE'] } },
  })

  if (!activeCampaign) return

  const lead = await db.lead.findUnique({
    where:  { id: leadId },
    select: { journeyState: true },
  })

  const now = new Date()

  await db.$transaction([
    db.reactivationCampaign.update({
      where: { id: activeCampaign.id },
      data: {
        status:      'RESPONDED',
        responded:   true,
        respondedAt: now,
      },
    }),

    // Avanzar de INACTIVO a CALIFICADO (no tocar otros estados)
    ...(lead?.journeyState === 'INACTIVO'
      ? [
          db.lead.update({
            where: { id: leadId },
            data: {
              journeyState:   'CALIFICADO',
              lastActivityAt: now,
            },
          }),
          db.journeyEvent.create({
            data: {
              leadId,
              type:        'AI_REENGAGED',
              fromState:   'INACTIVO',
              toState:     'CALIFICADO',
              isAutomatic: true,
              metadata:    { trigger: 'campaign_response', campaignId: activeCampaign.id },
              note:        'Paciente respondió a la campaña de reactivación',
            },
          }),
        ]
      : []),
  ])
}

export async function markCampaignAsConverted(
  leadId:  string,
  revenue: number
): Promise<void> {
  const campaign = await db.reactivationCampaign.findFirst({
    where: { leadId, status: { in: ['RESPONDED', 'ACTIVE'] } },
  })

  if (!campaign) return

  await db.reactivationCampaign.update({
    where: { id: campaign.id },
    data: {
      status:      'CONVERTED',
      convertedAt: new Date(),
      revenue,
    },
  })
}
