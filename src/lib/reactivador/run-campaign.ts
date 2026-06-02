import { db } from '@/lib/db'
import { getInactivePatients } from './segment-patients'
import { createCampaign, executeCampaignAttempt } from './campaign-executor'
import type { PatientToReactivate } from './segment-patients'

export type RunResult = {
  clinicId:          string
  newCampaigns:      number
  messagesAttempted: number
  messagesSent:      number
  errors:            number
}

export async function runReactivationCycle(clinicId: string): Promise<RunResult> {
  const clinic = await db.clinic.findUnique({
    where: { id: clinicId },
  })

  if (!clinic?.reactivadorActive) {
    return { clinicId, newCampaigns: 0, messagesAttempted: 0, messagesSent: 0, errors: 0 }
  }

  const config         = (clinic.reactivadorConfig as Record<string, unknown>) ?? {}
  const inactivityDays = (config.inactivityDays  as number)          ?? 90
  const maxAttempts    = (config.maxAttempts      as number)          ?? 3
  const daysBetween    = (config.daysBetweenMsgs  as number)          ?? 7
  const incentive      = config.incentive as string | undefined
  const tone           = (config.tone as 'amigable' | 'formal')       ?? 'amigable'

  let newCampaigns = 0, messagesAttempted = 0, messagesSent = 0, errors = 0

  // 1. Identificar pacientes inactivos sin campaña activa
  const inactivePatients = await getInactivePatients(clinicId, inactivityDays)

  // 2. Crear campañas para los primeros 20 nuevos inactivos
  for (const patient of inactivePatients.slice(0, 20)) {
    try {
      await createCampaign(patient, clinicId, daysBetween, maxAttempts)
      newCampaigns++
      await new Promise(r => setTimeout(r, 200))
    } catch (err) {
      console.error(`[reactivador] crear campaña lead ${patient.leadId}:`, err)
      errors++
    }
  }

  // 3. Ejecutar intentos pendientes
  const pendingCampaigns = await db.reactivationCampaign.findMany({
    where: {
      clinicId,
      status:        { in: ['PENDING', 'ACTIVE'] },
      nextAttemptAt: { lte: new Date() },
    },
    include: {
      lead: {
        select: {
          id:            true,
          fullName:      true,
          phone:         true,
          patientId:     true,
          socialProfiles: { take: 1 },
        },
      },
    },
    take: 50,
  })

  // Cargar citas en bloque para las campañas pendientes
  const patientIds = pendingCampaigns
    .map(c => c.lead.patientId)
    .filter(Boolean) as string[]

  const patientAppts = await db.patient.findMany({
    where:   { id: { in: patientIds } },
    include: { appointments: { orderBy: { scheduledAt: 'desc' }, take: 3 } },
  })
  const apptMap = new Map(patientAppts.map(p => [p.id, p.appointments]))

  for (const campaign of pendingCampaigns) {
    try {
      const leadAppts    = campaign.lead.patientId
        ? (apptMap.get(campaign.lead.patientId) ?? [])
        : []
      const lastAppt     = leadAppts.find(a => a.status === 'COMPLETED')
      const totalVisits  = leadAppts.filter(a => a.status === 'COMPLETED').length

      const patient: PatientToReactivate = {
        leadId:              campaign.leadId,
        fullName:            campaign.lead.fullName,
        phone:               campaign.lead.phone,
        channel:             (campaign.lead.socialProfiles[0]?.channel as string) ?? 'WHATSAPP',
        daysSinceLastAppt:   campaign.daysSinceLastAppt,
        lastTreatment:       campaign.treatmentFocus,
        lastAppointmentDate: lastAppt?.scheduledAt ?? null,
        segment:             campaign.segment,
        totalVisits,
        hasPendingBudget:    false,
      }

      const result = await executeCampaignAttempt({
        campaignId: campaign.id,
        clinicId,
        clinicName: clinic.name,
        patient,
        incentive,
        tone,
        daysBetween,
      })

      if (result.attempted) {
        messagesAttempted++
        if (result.success) messagesSent++
      }

      await new Promise(r => setTimeout(r, 1000))
    } catch (err) {
      console.error(`[reactivador] campaña ${campaign.id}:`, err)
      errors++
    }
  }

  return { clinicId, newCampaigns, messagesAttempted, messagesSent, errors }
}
