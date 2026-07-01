import { redirect } from "next/navigation"
import { auth } from "../../../../../auth"
import { getClinicInfo } from "@/lib/actions/clinic-info"
import { ClinicInfoForm } from "@/components/settings/ClinicInfoForm"

export const dynamic = "force-dynamic"

export default async function MiClinicaPage() {
  const session = await auth()
  if (!session?.user?.clinicId) redirect("/login")

  const result = await getClinicInfo()
  if (!result.success || !result.data) redirect("/settings")

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-[18px] font-bold text-ink-primary">Mi clínica</h1>
        <p className="text-[13px] text-ink-tertiary mt-0.5">
          Logo y datos que aparecen en los presupuestos y documentos.
        </p>
      </div>
      <ClinicInfoForm clinic={result.data} />
    </div>
  )
}
