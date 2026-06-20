import { requirePermission } from "@/lib/rbac/guards"
import { getCompletedServices, getPendingServices } from "@/lib/reports/completed-services"
import { parsePeriodParams } from "@/lib/reports/period"
import { getClinicDoctors } from "@/lib/actions/services"
import { CompletedServicesTable } from "@/components/reports/CompletedServicesTable"
import { PeriodSelector } from "@/components/reports/PeriodSelector"
import { DoctorFilter } from "@/components/reports/DoctorFilter"
import { ReportActionButtons } from "@/components/reports/ReportActionButtons"
import { RestrictedAccess } from "@/components/reports/RestrictedAccess"
import { format } from "date-fns"

export default async function ServiciosTerminadosPage({
  searchParams,
}: { searchParams: Promise<{ from?: string; to?: string; doctorId?: string }> }) {
  const guard = await requirePermission("reports", "view_financial")
  if (!guard.authorized) return <RestrictedAccess />

  const params = await searchParams
  const period = parsePeriodParams(params)
  const filters = { period, doctorId: params.doctorId }

  const [completed, pending, doctorsRes] = await Promise.all([
    getCompletedServices(guard.user.clinicId, filters),
    getPendingServices(guard.user.clinicId, filters),
    getClinicDoctors(),
  ])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <PeriodSelector from={format(period.start, "yyyy-MM-dd")} to={format(period.end, "yyyy-MM-dd")} />
          <DoctorFilter doctors={doctorsRes.success && doctorsRes.data ? doctorsRes.data : []} value={params.doctorId} />
        </div>
        <ReportActionButtons />
      </div>
      <CompletedServicesTable completed={completed} pending={pending} />
    </div>
  )
}
