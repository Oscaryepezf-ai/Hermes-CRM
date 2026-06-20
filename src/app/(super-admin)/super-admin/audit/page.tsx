import { redirect } from "next/navigation"
import { auth } from "../../../../../auth"
import { getAuditLog } from "@/lib/actions/super-admin"
import { PlatformShell } from "@/components/super-admin/PlatformShell"
import { AuditLogTable } from "@/components/super-admin/AuditLogTable"

export default async function AuditPage() {
  const session = await auth()
  const user = session?.user as any
  if (!user?.isSuperAdmin) redirect("/dashboard")

  const res = await getAuditLog()
  const logs = res.success ? res.data : []

  return (
    <PlatformShell adminName={session!.user.name ?? "Admin"}>
      <div className="space-y-4 max-w-4xl">
        <div>
          <h1 className="text-[20px] font-bold text-ink-primary">Auditoría</h1>
          <p className="text-[13px] text-ink-tertiary mt-0.5">
            Historial de acciones de Super Admin — últimas {logs.length}
          </p>
        </div>
        <AuditLogTable logs={logs as any} />
      </div>
    </PlatformShell>
  )
}
