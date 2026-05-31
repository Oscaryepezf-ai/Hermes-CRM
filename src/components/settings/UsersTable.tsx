"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Users, MoreVertical, CheckCircle, XCircle, RefreshCw } from "lucide-react"
import { RoleBadge } from "@/components/rbac/RoleBadge"
import { getClinicUsers, updateUserRole, toggleUserStatus } from "@/lib/actions/users"
import type { UserRole } from "@prisma/client"
import { formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"

type UserRow = {
  id: string
  name: string
  email: string
  role: UserRole
  isActive: boolean
  avatarUrl: string | null
  lastLoginAt: Date | null
  createdAt: Date
}

type Filter = "all" | "active" | "inactive"

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: "ADMIN", label: "Administrador" },
  { value: "DOCTOR", label: "Doctor" },
  { value: "RECEPTIONIST", label: "Recepcionista" },
]

export function UsersTable({ currentUserId }: { currentUserId: string }) {
  const [users, setUsers] = useState<UserRow[]>([])
  const [filter, setFilter] = useState<Filter>("all")
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const [loading, setLoading] = useState<string | null>(null)

  const loadUsers = () =>
    getClinicUsers().then((res) => {
      if (res.success) setUsers(res.data as UserRow[])
    })

  useEffect(() => {
    loadUsers()
  }, [])

  const filtered = users.filter((u) =>
    filter === "all" ? true : filter === "active" ? u.isActive : !u.isActive
  )

  const handleRoleChange = async (userId: string, role: UserRole) => {
    setLoading(userId)
    const res = await updateUserRole(userId, role)
    setLoading(null)
    setOpenMenu(null)
    if (res.success) {
      toast.success("Rol actualizado")
      loadUsers()
    } else {
      toast.error(res.error)
    }
  }

  const handleToggle = async (userId: string, isActive: boolean) => {
    setLoading(userId)
    const res = await toggleUserStatus(userId, isActive)
    setLoading(null)
    setOpenMenu(null)
    if (res.success) {
      toast.success(isActive ? "Usuario reactivado" : "Usuario desactivado")
      loadUsers()
    } else {
      toast.error(res.error)
    }
  }

  const activeCount = users.filter((u) => u.isActive).length

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-indigo-500" />
          <span className="text-sm font-semibold text-gray-800">
            {activeCount} miembro{activeCount !== 1 ? "s" : ""} activo{activeCount !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
          {(["all", "active", "inactive"] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                filter === f ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {f === "all" ? "Todos" : f === "active" ? "Activos" : "Inactivos"}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-gray-400">
          <Users className="w-10 h-10 mb-3 opacity-30" />
          <p className="text-sm">
            {filter === "inactive" ? "No hay usuarios inactivos" : "Invita a tu equipo para empezar a delegar"}
          </p>
        </div>
      ) : (
        <div className="divide-y divide-gray-50">
          {filtered.map((user) => {
            const isSelf = user.id === currentUserId
            const isLoading = loading === user.id

            return (
              <div key={user.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50/50">
                {/* Avatar */}
                <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0 text-indigo-600 text-sm font-semibold">
                  {user.name.charAt(0).toUpperCase()}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-800 truncate">{user.name}</p>
                    {isSelf && (
                      <span className="text-[10px] font-medium text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">Tú</span>
                    )}
                    {!user.isActive && (
                      <span className="text-[10px] font-medium text-red-500 bg-red-50 px-1.5 py-0.5 rounded">Inactivo</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 truncate">{user.email}</p>
                </div>

                {/* Role badge */}
                <RoleBadge role={user.role} size="sm" />

                {/* Last login */}
                <p className="text-[11px] text-gray-400 hidden md:block w-28 text-right flex-shrink-0">
                  {user.lastLoginAt
                    ? formatDistanceToNow(new Date(user.lastLoginAt), { locale: es, addSuffix: true })
                    : "Nunca"}
                </p>

                {/* Actions menu */}
                {!isSelf && (
                  <div className="relative flex-shrink-0">
                    <button
                      onClick={() => setOpenMenu(openMenu === user.id ? null : user.id)}
                      disabled={isLoading}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-50 transition-colors"
                    >
                      {isLoading ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <MoreVertical className="w-3.5 h-3.5" />
                      )}
                    </button>

                    {openMenu === user.id && (
                      <div className="absolute right-0 top-8 w-48 bg-white rounded-xl shadow-lg border border-gray-100 z-20 py-1 overflow-hidden">
                        <p className="px-3 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wide">Cambiar rol</p>
                        {ROLE_OPTIONS.map((opt) => (
                          <button
                            key={opt.value}
                            onClick={() => handleRoleChange(user.id, opt.value)}
                            className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-50 transition-colors ${
                              user.role === opt.value ? "font-semibold text-indigo-600" : "text-gray-700"
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                        <div className="border-t border-gray-100 mt-1 pt-1">
                          {user.isActive ? (
                            <button
                              onClick={() => handleToggle(user.id, false)}
                              className="w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              Desactivar cuenta
                            </button>
                          ) : (
                            <button
                              onClick={() => handleToggle(user.id, true)}
                              className="w-full text-left px-3 py-2 text-xs text-green-600 hover:bg-green-50 transition-colors flex items-center gap-2"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                              Reactivar cuenta
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
