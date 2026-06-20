import { db } from "@/lib/db"
import { format } from "date-fns"
import { es } from "date-fns/locale"

export async function getAnnualReport(clinicId: string, year: number) {
  const yearStart = new Date(year, 0, 1)
  const yearEnd = new Date(year, 11, 31, 23, 59, 59, 999)

  const [payments, expenses] = await Promise.all([
    db.payment.findMany({
      where: { clinicId, paidAt: { gte: yearStart, lte: yearEnd } },
      include: { patient: { select: { id: true, fullName: true } } },
    }),
    db.expense.findMany({
      where: { clinicId, expenseDate: { gte: yearStart, lte: yearEnd } },
    }),
  ])

  const monthlyRows = Array.from({ length: 12 }, (_, m) => {
    const label = format(new Date(year, m, 1), "MMMM", { locale: es })
    const ingreso = payments.filter((p) => p.paidAt.getMonth() === m).reduce((s, p) => s + p.amount, 0)
    const egreso = expenses.filter((e) => e.expenseDate.getMonth() === m).reduce((s, e) => s + e.amount, 0)
    return { month: label, ingreso, egreso, utilidad: ingreso - egreso }
  })

  const totalIngreso = payments.reduce((s, p) => s + p.amount, 0)
  const totalEgreso = expenses.reduce((s, e) => s + e.amount, 0)

  const expensesByCategory = Array.from(
    expenses.reduce((acc, e) => {
      acc.set(e.category, (acc.get(e.category) ?? 0) + e.amount)
      return acc
    }, new Map<string, number>()).entries()
  ).map(([label, value]) => ({ label, value }))

  const byPatient = new Map<string, { name: string; total: number }>()
  for (const p of payments) {
    const current = byPatient.get(p.patient.id) ?? { name: p.patient.fullName, total: 0 }
    current.total += p.amount
    byPatient.set(p.patient.id, current)
  }
  const topPatients = Array.from(byPatient.values()).sort((a, b) => b.total - a.total).slice(0, 10)

  return {
    monthlyRows,
    expensesByCategory,
    summary: { totalIngreso, totalEgreso, utilidad: totalIngreso - totalEgreso },
    topPatients,
  }
}
