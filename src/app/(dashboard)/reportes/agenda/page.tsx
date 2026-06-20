import { redirect } from "next/navigation"
import { requirePermission } from "@/lib/rbac/guards"
import { getAgendaProductivity } from "@/lib/reports/agenda-productivity"
import { parsePeriodParams } from "@/lib/reports/period"
import { AgendaProductivityCharts } from "@/components/reports/AgendaProductivityCharts"
import { PeriodSelector } from "@/components/reports/PeriodSelector"
import { format } from "date-fns"

export default async function AgendaReportPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  const guard = await requirePermission("reports", "view")
  if (!guard.authorized) redirect("/dashboard")

  const params = await searchParams
  const period = parsePeriodParams(params)
  const data = await getAgendaProductivity(guard.user.clinicId, period)

  return (
    <div className="space-y-4">
      <PeriodSelector from={format(period.start, "yyyy-MM-dd")} to={format(period.end, "yyyy-MM-dd")} />
      <AgendaProductivityCharts {...data} />
    </div>
  )
}
