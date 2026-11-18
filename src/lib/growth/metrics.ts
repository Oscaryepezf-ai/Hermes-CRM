import { db } from "@/lib/db"
import type { PeriodRange } from "@/lib/reports/period"
import type { MarketingChannel } from "@prisma/client"

// Instrucción anti-error del spec: si el denominador es 0, nunca mostrar
// NaN/Infinity — se devuelve este sentinel y la UI lo renderiza tal cual.
export const NO_DATA = "Sin datos suficientes" as const
export type MetricResult = number | typeof NO_DATA

function safeDivide(numerator: number, denominator: number): MetricResult {
  return denominator > 0 ? numerator / denominator : NO_DATA
}

export type ChannelBreakdown = {
  channel: MarketingChannel
  spend: number
  leads: number
  cpl: MetricResult
}

export type CohortMetrics = {
  period: PeriodRange
  totalSpend: number
  cohortSize: number
  scheduledCount: number
  attendedCount: number
  treatmentStartedCount: number
  netCollections: number
  cpl: MetricResult
  cpa: MetricResult
  schedulingRate: MetricResult
  attendanceRate: MetricResult
  startRate: MetricResult
  byChannel: ChannelBreakdown[]
}

/**
 * Vista de Cohorte: solo contactos CREADOS en el rango, rastreando su avance
 * sin importar cuándo ocurrieron los eventos siguientes (agendamiento, pago, etc).
 * "Agendado"/"Asistió" se derivan de JourneyEvent.toState (CITA_AGENDADA / EN_CONSULTA)
 * en vez del journeyState actual, porque el estado actual no es monótono
 * (ej. PACIENTE_ACTIVO puede volver a INACTIVO) — ver src/lib/journey/state-machine.ts.
 */
export async function getCohortMetrics(
  clinicId: string,
  period: PeriodRange,
  channel?: MarketingChannel
): Promise<CohortMetrics> {
  const leadWhere = {
    clinicId,
    createdAt: { gte: period.start, lte: period.end },
    ...(channel ? { channel } : {}),
  }

  const cohortLeads = await db.lead.findMany({
    where: leadWhere,
    select: { id: true, channel: true, patientId: true, convertedAt: true },
  })
  const leadIds = cohortLeads.map((l) => l.id)
  const patientIds = cohortLeads
    .map((l) => l.patientId)
    .filter((id): id is string => id !== null)

  const [scheduledEvents, attendedEvents, spendAgg, paymentsByType, channelGroups, spendRows] =
    await Promise.all([
      leadIds.length
        ? db.journeyEvent.findMany({
            where: { leadId: { in: leadIds }, toState: "CITA_AGENDADA" },
            select: { leadId: true },
            distinct: ["leadId"],
          })
        : [],
      leadIds.length
        ? db.journeyEvent.findMany({
            where: { leadId: { in: leadIds }, toState: "EN_CONSULTA" },
            select: { leadId: true },
            distinct: ["leadId"],
          })
        : [],
      db.dailyAdSpend.aggregate({
        where: {
          date: { gte: period.start, lte: period.end },
          campaign: { clinicId, ...(channel ? { channel } : {}) },
        },
        _sum: { spendAmount: true },
      }),
      patientIds.length
        ? db.payment.groupBy({
            by: ["type"],
            where: { patientId: { in: patientIds } },
            _sum: { amount: true },
          })
        : [],
      db.lead.groupBy({ by: ["channel"], where: leadWhere, _count: { id: true } }),
      db.dailyAdSpend.findMany({
        where: { date: { gte: period.start, lte: period.end }, campaign: { clinicId } },
        select: { spendAmount: true, campaign: { select: { channel: true } } },
      }),
    ])

  const cohortSize = cohortLeads.length
  const scheduledCount = scheduledEvents.length
  const attendedCount = attendedEvents.length
  const treatmentStartedCount = cohortLeads.filter((l) => l.convertedAt !== null).length
  const totalSpend = spendAgg._sum.spendAmount?.toNumber() ?? 0

  const grossPayments =
    paymentsByType.find((p) => p.type === "PAYMENT")?._sum.amount ?? 0
  const refunds = paymentsByType.find((p) => p.type === "REFUND")?._sum.amount ?? 0
  const netCollections = grossPayments - refunds

  const spendByChannel = new Map<MarketingChannel, number>()
  for (const row of spendRows) {
    const ch = row.campaign.channel
    spendByChannel.set(ch, (spendByChannel.get(ch) ?? 0) + row.spendAmount.toNumber())
  }
  const byChannel: ChannelBreakdown[] = channelGroups.map((g) => {
    const spend = spendByChannel.get(g.channel) ?? 0
    return { channel: g.channel, spend, leads: g._count.id, cpl: safeDivide(spend, g._count.id) }
  })

  return {
    period,
    totalSpend,
    cohortSize,
    scheduledCount,
    attendedCount,
    treatmentStartedCount,
    netCollections,
    cpl: safeDivide(totalSpend, cohortSize),
    cpa: safeDivide(totalSpend, treatmentStartedCount),
    schedulingRate: safeDivide(scheduledCount, cohortSize),
    attendanceRate: safeDivide(attendedCount, scheduledCount),
    startRate: safeDivide(treatmentStartedCount, attendedCount),
    byChannel,
  }
}

export type ActivityMetrics = {
  period: PeriodRange
  totalSpend: number
  grossPayments: number
  refunds: number
  netCollections: number
  newPatientsStartedCount: number
  cpa: MetricResult
}

/**
 * Vista de Actividad: eventos transaccionales OCURRIDOS en el rango
 * (gasto registrado esos días, pagos cobrados esos días), sin importar
 * cuándo ingresó el contacto originalmente.
 */
export async function getActivityMetrics(
  clinicId: string,
  period: PeriodRange,
  channel?: MarketingChannel
): Promise<ActivityMetrics> {
  const [spendAgg, paymentsByType, newPatientsStarted] = await Promise.all([
    db.dailyAdSpend.aggregate({
      where: {
        date: { gte: period.start, lte: period.end },
        campaign: { clinicId, ...(channel ? { channel } : {}) },
      },
      _sum: { spendAmount: true },
    }),
    db.payment.groupBy({
      by: ["type"],
      where: { clinicId, paidAt: { gte: period.start, lte: period.end } },
      _sum: { amount: true },
    }),
    db.lead.count({
      where: {
        clinicId,
        convertedAt: { gte: period.start, lte: period.end },
        ...(channel ? { channel } : {}),
      },
    }),
  ])

  const totalSpend = spendAgg._sum.spendAmount?.toNumber() ?? 0
  const grossPayments = paymentsByType.find((p) => p.type === "PAYMENT")?._sum.amount ?? 0
  const refunds = paymentsByType.find((p) => p.type === "REFUND")?._sum.amount ?? 0

  return {
    period,
    totalSpend,
    grossPayments,
    refunds,
    netCollections: grossPayments - refunds,
    newPatientsStartedCount: newPatientsStarted,
    cpa: safeDivide(totalSpend, newPatientsStarted),
  }
}

export function formatMetric(value: MetricResult, kind: "currency" | "percent" | "number"): string {
  if (value === NO_DATA) return NO_DATA
  if (kind === "currency") {
    return new Intl.NumberFormat("es-EC", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(value)
  }
  if (kind === "percent") {
    return `${Math.round(value * 100)}%`
  }
  return String(Math.round(value * 100) / 100)
}
