import { requirePermission } from "@/lib/rbac/guards"
import { db } from "@/lib/db"
import { getServicesSold } from "@/lib/reports/services-sold"
import { parsePeriodParams } from "@/lib/reports/period"
import { ServicesSoldPanel } from "@/components/reports/ServicesSoldPanel"
import { PeriodSelector } from "@/components/reports/PeriodSelector"
import { RestrictedAccess } from "@/components/reports/RestrictedAccess"
import { format } from "date-fns"

export default async function ServiciosVendidosPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  const guard = await requirePermission("reports", "view_financial")
  if (!guard.authorized) return <RestrictedAccess />

  const params = await searchParams
  const period = parsePeriodParams(params)
  const [summary, services] = await Promise.all([
    getServicesSold(guard.user.clinicId, period),
    db.service.findMany({ where: { clinicId: guard.user.clinicId, isActive: true }, orderBy: { name: "asc" } }),
  ])

  return (
    <div className="space-y-4">
      <PeriodSelector from={format(period.start, "yyyy-MM-dd")} to={format(period.end, "yyyy-MM-dd")} />
      <ServicesSoldPanel byService={summary.byService} byCategory={summary.byCategory} services={services} />
    </div>
  )
}
