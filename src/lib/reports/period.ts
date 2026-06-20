export type PeriodRange = { start: Date; end: Date }

export function getDefaultPeriod(): PeriodRange {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
  return { start, end }
}

export function parsePeriodParams(searchParams: { from?: string; to?: string }): PeriodRange {
  if (searchParams.from && searchParams.to) {
    const start = new Date(`${searchParams.from}T00:00:00`)
    const end = new Date(`${searchParams.to}T23:59:59.999`)
    if (!isNaN(start.getTime()) && !isNaN(end.getTime())) return { start, end }
  }
  return getDefaultPeriod()
}
