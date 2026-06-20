import { redirect } from "next/navigation"
import { auth } from "../../../../../auth"
import { getAllUsersAcrossClinics } from "@/lib/actions/super-admin"
import { PlatformShell } from "@/components/super-admin/PlatformShell"
import { UsersTable } from "@/components/super-admin/UsersTable"

export default async function GlobalUsersPage() {
  const session = await auth()
  const user = session?.user as any
  if (!user?.isSuperAdmin) redirect("/dashboard")

  const res = await getAllUsersAcrossClinics()
  const users = res.success ? res.data : []

  return (
    <PlatformShell adminName={session!.user.name ?? "Admin"}>
      <div className="space-y-4 max-w-7xl">
        <div>
          <h1 className="text-[20px] font-bold text-ink-primary">Usuarios</h1>
          <p className="text-[13px] text-ink-tertiary mt-0.5">
            Todos los usuarios de todas las clínicas de la plataforma
          </p>
        </div>
        <UsersTable users={users as any} />
      </div>
    </PlatformShell>
  )
}
