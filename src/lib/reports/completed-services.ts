import { db } from "@/lib/db"
import type { PeriodRange } from "./period"

export type CompletedServiceFilters = {
  doctorId?: string
  period: PeriodRange
}

export async function getCompletedServices(clinicId: string, filters: CompletedServiceFilters) {
  const payments = await db.payment.findMany({
    where: {
      clinicId,
      paidAt: { gte: filters.period.start, lte: filters.period.end },
      ...(filters.doctorId && { doctorId: filters.doctorId }),
    },
    include: {
      patient: { select: { fullName: true } },
      service: { select: { name: true } },
    },
    orderBy: { paidAt: "desc" },
  })

  const totalRecaudado = payments.reduce((s, p) => s + p.amount, 0)
  const totalComision = payments.reduce((s, p) => s + (p.commissionValue ?? 0), 0)

  return {
    rows: payments.map((p) => ({
      id: p.id,
      paciente: p.patient.fullName,
      medioDePago: p.paymentMethod,
      comprobante: p.receiptType,
      servicio: p.service?.name ?? "—",
      totalPagado: p.amount,
      descuento1: p.discount1 ?? 0,
      descuento2: p.discount2 ?? 0,
      comision: p.commissionValue ?? 0,
      comentario: p.comment ?? "",
    })),
    totalRecaudado,
    totalComision,
    cantidad: payments.length,
  }
}

export async function getPendingServices(clinicId: string, filters: CompletedServiceFilters) {
  const appointments = await db.appointment.findMany({
    where: {
      clinicId,
      scheduledAt: { gte: filters.period.start, lte: filters.period.end },
      ...(filters.doctorId && { dentistId: filters.doctorId }),
      status: { in: ["SCHEDULED", "CONFIRMED", "COMPLETED"] },
      value: { not: null },
    },
    include: {
      patient: { select: { fullName: true } },
      payments: { select: { amount: true } },
    },
  })

  const pending = appointments
    .map((a) => {
      const paid = a.payments.reduce((s, p) => s + p.amount, 0)
      return {
        id: a.id,
        paciente: a.patient.fullName,
        servicio: a.procedure,
        totalPagado: paid,
        pendiente: (a.value ?? 0) - paid,
      }
    })
    .filter((row) => row.pendiente > 0.01)

  return { rows: pending, cantidad: pending.length }
}
