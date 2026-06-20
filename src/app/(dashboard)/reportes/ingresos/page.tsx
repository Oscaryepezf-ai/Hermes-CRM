import { requirePermission } from "@/lib/rbac/guards"
import { getIncomeExpenseSummary } from "@/lib/reports/income-expenses"
import { parsePeriodParams } from "@/lib/reports/period"
import { IncomeExpenseCharts } from "@/components/reports/IncomeExpenseCharts"
import { PeriodSelector } from "@/components/reports/PeriodSelector"
import { ReportActionButtons } from "@/components/reports/ReportActionButtons"
import { RestrictedAccess } from "@/components/reports/RestrictedAccess"
import { format } from "date-fns"

export default async function IngresosPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  const guard = await requirePermission("reports", "view_financial")
  if (!guard.authorized) return <RestrictedAccess />

  const params = await searchParams
  const period = parsePeriodParams(params)
  const summary = await getIncomeExpenseSummary(guard.user.clinicId, period)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <PeriodSelector from={format(period.start, "yyyy-MM-dd")} to={format(period.end, "yyyy-MM-dd")} />
        <ReportActionButtons />
      </div>
      <IncomeExpenseCharts {...summary} />
    </div>
  )
}
