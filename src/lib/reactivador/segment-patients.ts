import { db } from '@/lib/db'
import { subDays } from 'date-fns'
import type { ReactivationSegment } from '@prisma/client'

export type PatientToReactivate = {
  leadId:              string
  fullName:            string
  phone:               string
  channel:             string
  daysSinceLastAppt:   number
  lastTreatment:       string | null
  lastAppointmentDate: Date | null
  segment:             ReactivationSegment
  totalVisits:         number
  hasPendingBudget:    boolean
}

export async function getInactivePatients(
  clinicId:       string,
  inactivityDays: number = 90
): Promise<PatientToReactivate[]> {
  const cutoffDate = subDays(new Date(), inactivityDays)
  const now = new Date()

  // Leads en estado candidato, ya convertidos a paciente, sin campaña activa
  const leads = await db.lead.findMany({
    where: {
      clinicId,
      journeyState: { in: ['PACIENTE_ACTIVO', 'INACTIVO'] },
      patientId:    { not: null },
      reactivationCampaigns: {
        none: { status: { in: ['PENDING', 'ACTIVE'] } },
      },
    },
    select: {
      id:            true,
      fullName:      true,
      phone:         true,
      patientId:     true,
      journeyState:  true,
      socialProfiles: { select: { channel: true }, take: 1 },
    },
  })

  if (leads.length === 0) return []

  // Obtener citas de los pacientes en bloque
  const patientIds = leads.map(l => l.patientId).filter(Boolean) as string[]
  const patients = await db.patient.findMany({
    where: { id: { in: patientIds } },
    include: {
      appointments: { orderBy: { scheduledAt: 'desc' }, take: 5 },
    },
  })
  const patientMap = new Map(patients.map(p => [p.id, p]))

  const result: PatientToReactivate[] = []

  for (const lead of leads) {
    if (!lead.patientId) continue
    const patient      = patientMap.get(lead.patientId)
    const allAppts     = patient?.appointments ?? []
    const completedAppts = allAppts.filter(a => a.status === 'COMPLETED')
    const lastCompleted  = completedAppts[0]

    if (!lastCompleted) continue
    if (lastCompleted.scheduledAt > cutoffDate) continue

    const futureAppt = allAppts.find(
      a => a.scheduledAt > now && ['SCHEDULED', 'CONFIRMED'].includes(a.status)
    )
    if (futureAppt) continue

    const daysSince = Math.floor(
      (now.getTime() - lastCompleted.scheduledAt.getTime()) / (1000 * 60 * 60 * 24)
    )

    const hasPendingBudget =
      lead.journeyState === 'INACTIVO' &&
      allAppts.some(a => a.status === 'CANCELLED')

    result.push({
      leadId:              lead.id,
      fullName:            lead.fullName,
      phone:               lead.phone,
      channel:             (lead.socialProfiles[0]?.channel as string) ?? 'WHATSAPP',
      daysSinceLastAppt:   daysSince,
      lastTreatment:       lastCompleted.procedure,
      lastAppointmentDate: lastCompleted.scheduledAt,
      segment:             classifySegment(daysSince, hasPendingBudget, completedAppts.length),
      totalVisits:         completedAppts.length,
      hasPendingBudget,
    })
  }

  return result.sort((a, b) => b.daysSinceLastAppt - a.daysSinceLastAppt)
}

function classifySegment(
  daysSince:        number,
  hasPendingBudget: boolean,
  totalVisits:      number
): ReactivationSegment {
  if (hasPendingBudget)                  return 'PERDIO_PRESUPUESTO'
  if (daysSince > 180)                   return 'LARGO_PLAZO_INACTIVO'
  if (daysSince > 90 && totalVisits > 2) return 'TRATAMIENTO_INCOMPLETO'
  if (daysSince > 90)                    return 'CONTROL_PENDIENTE'
  return 'SIN_CLASIFICAR'
}

export async function getReactivationStats(clinicId: string) {
  const [
    totalInactive,
    activeCampaigns,
    respondedThisMonth,
    convertedThisMonth,
  ] = await Promise.all([
    db.lead.count({ where: { clinicId, journeyState: 'INACTIVO' } }),
    db.reactivationCampaign.count({
      where: { clinicId, status: { in: ['PENDING', 'ACTIVE'] } },
    }),
    db.reactivationCampaign.count({
      where: {
        clinicId,
        responded:   true,
        respondedAt: { gte: subDays(new Date(), 30) },
      },
    }),
    db.reactivationCampaign.count({
      where: {
        clinicId,
        status:      'CONVERTED',
        convertedAt: { gte: subDays(new Date(), 30) },
      },
    }),
  ])

  const [totalResponded, totalCampaigns, revenueResult] = await Promise.all([
    db.reactivationCampaign.count({ where: { clinicId, responded: true } }),
    db.reactivationCampaign.count({ where: { clinicId } }),
    db.reactivationCampaign.aggregate({
      where:  { clinicId, status: 'CONVERTED', revenue: { not: null } },
      _sum:   { revenue: true },
    }),
  ])

  const responseRate = totalCampaigns > 0
    ? Math.round((totalResponded / totalCampaigns) * 100)
    : 0

  return {
    totalInactive,
    activeCampaigns,
    respondedThisMonth,
    convertedThisMonth,
    responseRate,
    totalRevenueRecovered: revenueResult._sum.revenue ?? 0,
  }
}
