import { redirect, notFound } from "next/navigation"
import { auth } from "../../../../../../auth"
import { getClinicDetail } from "@/lib/actions/super-admin"
import { PlatformShell } from "@/components/super-admin/PlatformShell"
import { ClinicDetail } from "@/components/super-admin/ClinicDetail"

export default async function ClinicDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  const user = session?.user as any
  if (!user?.isSuperAdmin) redirect("/dashboard")

  const { id } = await params
  const res = await getClinicDetail(id)
  if (!res.success) notFound()

  return (
    <PlatformShell adminName={session!.user.name ?? "Admin"}>
      <ClinicDetail clinic={res.data as any} />
    </PlatformShell>
  )
}
