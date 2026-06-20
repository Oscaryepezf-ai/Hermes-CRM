import { redirect } from "next/navigation"
import { requirePermission } from "@/lib/rbac/guards"
import { getPatientAcquisition } from "@/lib/reports/patient-acquisition"
import { PatientAcquisitionPanel } from "@/components/reports/PatientAcquisitionPanel"
import type { MarketingChannel } from "@prisma/client"

const DEFAULT_CHANNELS: MarketingChannel[] = ["FACEBOOK", "INSTAGRAM", "REFERIDO"]

export default async function PacientesReportPage({
  searchParams,
}: { searchParams: Promise<{ year?: string; channels?: string }> }) {
  const guard = await requirePermission("reports", "view")
  if (!guard.authorized) redirect("/dashboard")

  const params = await searchParams
  const year = params.year ? parseInt(params.year, 10) : new Date().getFullYear()
  const channels = (params.channels?.split(",").filter(Boolean) as MarketingChannel[]) ?? DEFAULT_CHANNELS
  const selectedChannels = channels.length > 0 ? channels : DEFAULT_CHANNELS

  const data = await getPatientAcquisition(guard.user.clinicId, year, selectedChannels)

  return (
    <PatientAcquisitionPanel
      year={year}
      totalPatients={data.totalPatients}
      distribution={data.distribution}
      monthlyComparison={data.monthlyComparison}
      selectedChannels={selectedChannels}
    />
  )
}
