import { db } from "@/lib/db"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import type { MarketingChannel } from "@prisma/client"

export async function getPatientAcquisition(clinicId: string, year: number, channels: MarketingChannel[]) {
  const leads = await db.lead.findMany({
    where: {
      clinicId,
      createdAt: { gte: new Date(year, 0, 1), lte: new Date(year, 11, 31, 23, 59, 59, 999) },
    },
    select: { channel: true, createdAt: true },
  })

  const totalPatients = leads.length
  const distribution = groupCount(leads, (l) => l.channel)

  const monthlyComparison = Array.from({ length: 12 }, (_, monthIdx) => {
    const row: Record<string, string | number> = {
      month: format(new Date(year, monthIdx, 1), "MMM", { locale: es }),
    }
    for (const channel of channels) {
      row[channel] = leads.filter((l) => l.channel === channel && l.createdAt.getMonth() === monthIdx).length
    }
    return row
  })

  return { totalPatients, distribution, monthlyComparison }
}

function groupCount<T>(items: T[], keyFn: (item: T) => string) {
  const map = new Map<string, number>()
  for (const item of items) {
    const key = keyFn(item)
    map.set(key, (map.get(key) ?? 0) + 1)
  }
  return Array.from(map.entries()).map(([label, count]) => ({ label, count }))
}
