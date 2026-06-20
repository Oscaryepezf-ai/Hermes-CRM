import { requirePermission } from "@/lib/rbac/guards"
import { getAnnualReport } from "@/lib/reports/annual-report"
import { AnnualReportPanel } from "@/components/reports/AnnualReportPanel"
import { RestrictedAccess } from "@/components/reports/RestrictedAccess"

export default async function AnnualReportPage({ searchParams }: { searchParams: Promise<{ year?: string }> }) {
  const guard = await requirePermission("reports", "view_financial")
  if (!guard.authorized) return <RestrictedAccess />

  const params = await searchParams
  const year = params.year ? parseInt(params.year, 10) : new Date().getFullYear()
  const data = await getAnnualReport(guard.user.clinicId, year)

  return <AnnualReportPanel year={year} {...data} />
}
