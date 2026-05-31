import { redirect } from "next/navigation"
import { auth } from "../../../../../auth"
import { UsersTable } from "@/components/settings/UsersTable"
import { InviteUserModal } from "@/components/settings/InviteUserModal"
import { Users } from "lucide-react"

export default async function UsersPage() {
  const session = await auth()
  if (!session) redirect("/login")
  if (session.user.role !== "ADMIN") redirect("/dashboard?error=unauthorized")

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center flex-shrink-0">
            <Users className="w-5 h-5 text-violet-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Equipo</h1>
            <p className="text-sm text-gray-500">Gestiona los usuarios y permisos de tu clínica</p>
          </div>
        </div>
        <InviteUserModal />
      </div>

      <UsersTable currentUserId={session.user.id} />
    </div>
  )
}
