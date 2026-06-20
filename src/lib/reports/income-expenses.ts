import { db } from "@/lib/db"
import { eachDayOfInterval, format, isSameDay } from "date-fns"
import { es } from "date-fns/locale"
import type { PeriodRange } from "./period"

export async function getIncomeExpenseSummary(clinicId: string, period: PeriodRange) {
  const [payments, expenses] = await Promise.all([
    db.payment.findMany({
      where: { clinicId, paidAt: { gte: period.start, lte: period.end } },
      include: { doctor: { select: { name: true } } },
    }),
    db.expense.findMany({
      where: { clinicId, expenseDate: { gte: period.start, lte: period.end } },
    }),
  ])

  const totalIncome = payments.reduce((s, p) => s + p.amount, 0)
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0)

  const days = eachDayOfInterval({ start: period.start, end: period.end })
  const dailySeries = days.map((day) => {
    const dayIncome = payments.filter((p) => isSameDay(p.paidAt, day)).reduce((s, p) => s + p.amount, 0)
    const dayExpense = expenses.filter((e) => isSameDay(e.expenseDate, day)).reduce((s, e) => s + e.amount, 0)
    return { date: format(day, "d MMM", { locale: es }), ingreso: dayIncome, egreso: dayExpense }
  })

  const byDoctor = Array.from(
    payments.reduce((acc, p) => {
      const current = acc.get(p.doctorId) ?? { name: p.doctor.name, total: 0 }
      current.total += p.amount
      acc.set(p.doctorId, current)
      return acc
    }, new Map<string, { name: string; total: number }>()).values()
  )

  const byReceiptType = aggregateBy(payments, (p) => p.receiptType, (p) => p.amount)
  const byPaymentMethod = aggregateBy(payments, (p) => p.paymentMethod, (p) => p.amount)

  return { totalIncome, totalExpenses, dailySeries, byDoctor, byReceiptType, byPaymentMethod }
}

function aggregateBy<T>(items: T[], keyFn: (item: T) => string, valFn: (item: T) => number) {
  const map = new Map<string, number>()
  for (const item of items) {
    const key = keyFn(item)
    map.set(key, (map.get(key) ?? 0) + valFn(item))
  }
  return Array.from(map.entries()).map(([label, value]) => ({ label, value }))
}
