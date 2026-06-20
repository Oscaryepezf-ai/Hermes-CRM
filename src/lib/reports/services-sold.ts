import { db } from "@/lib/db"
import type { PeriodRange } from "./period"

export async function getServicesSold(clinicId: string, period: PeriodRange) {
  const payments = await db.payment.findMany({
    where: { clinicId, paidAt: { gte: period.start, lte: period.end } },
    include: { service: { select: { name: true, category: true } } },
  })

  const total = payments.reduce((s, p) => s + p.amount, 0)
  const withService = payments.filter((p) => p.service)

  const byService = groupAndSum(withService, (p) => p.service!.name)
  const byCategory = groupAndSum(withService, (p) => p.service!.category)

  return { total, byService, byCategory }
}

function groupAndSum<T extends { amount: number }>(items: T[], keyFn: (item: T) => string) {
  const map = new Map<string, { income: number; count: number }>()
  for (const item of items) {
    const key = keyFn(item)
    const current = map.get(key) ?? { income: 0, count: 0 }
    current.income += item.amount
    current.count += 1
    map.set(key, current)
  }
  return Array.from(map.entries())
    .map(([label, { income, count }]) => ({ label, income, count }))
    .sort((a, b) => b.income - a.income)
}
