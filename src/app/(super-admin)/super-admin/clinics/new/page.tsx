import { redirect } from "next/navigation"
import { auth } from "../../../../../../auth"
import { PlatformShell } from "@/components/super-admin/PlatformShell"
import { CreateClinicForm } from "@/components/super-admin/CreateClinicForm"

export default async function NewClinicPage() {
  const session = await auth()
  const user = session?.user as any
  if (!user?.isSuperAdmin) redirect("/dashboard")

  return (
    <PlatformShell adminName={session!.user.name ?? "Admin"}>
      <CreateClinicForm />
    </PlatformShell>
  )
}
