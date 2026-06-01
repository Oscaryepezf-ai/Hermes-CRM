import { redirect } from "next/navigation"
import { auth } from "../../../../../auth"
import { getAllClinics } from "@/lib/actions/super-admin"
import { PlatformShell } from "@/components/super-admin/PlatformShell"
import { ClinicsTable } from "@/components/super-admin/ClinicsTable"

export default async function ClinicsPage() {
  const session = await auth()
  const user = session?.user as any
  if (!user?.isSuperAdmin) redirect("/dashboard")

  const res = await getAllClinics()
  const clinics = res.success ? res.data : []

  return (
    <PlatformShell adminName={session!.user.name ?? "Admin"}>
      <div className="space-y-4 max-w-7xl">
        <div>
          <h1 className="text-[20px] font-bold text-ink-primary">Clínicas</h1>
          <p className="text-[13px] text-ink-tertiary mt-0.5">
            Todos los tenants registrados en la plataforma
          </p>
        </div>
        <ClinicsTable clinics={clinics} />
      </div>
    </PlatformShell>
  )
}
