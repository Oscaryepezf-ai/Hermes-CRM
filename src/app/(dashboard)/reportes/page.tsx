import { redirect } from "next/navigation"
import { requirePermission } from "@/lib/rbac/guards"

export default async function ReportesIndexPage() {
  const guard = await requirePermission("reports", "view_financial")
  redirect(guard.authorized ? "/reportes/ingresos" : "/reportes/agenda")
}
