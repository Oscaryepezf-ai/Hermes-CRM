"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Crown, Stethoscope, User, CheckCircle2, XCircle } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { changeUserRole, resetUserPassword, toggleUserActive } from "@/lib/actions/super-admin"
import { toast } from "sonner"

const ROLE_LABELS: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  ADMIN:        { label: "Admin",         icon: Crown,       color: "bg-violet-50 text-violet-700" },
  DOCTOR:       { label: "Doctor",        icon: Stethoscope, color: "bg-blue-50 text-blue-700"   },
  RECEPTIONIST: { label: "Recepcionista", icon: User,        color: "bg-teal-50 text-teal-700"    },
}

type GlobalUser = {
  id: string
  name: string
  email: string
  role: string
  isActive: boolean
  createdAt: Date
  lastLoginAt: Date | null
  clinicId: string
  clinic: { name: string; suspendedAt: Date | null }
}

export function UsersTable({ users }: { users: GlobalUser[] }) {
  const router = useRouter()
  const [search, setSearch] = useState("")
  const [busyId, setBusyId] = useState<string | null>(null)

  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.clinic.name.toLowerCase().includes(search.toLowerCase())
  )

  const handleRoleChange = async (userId: string, newRole: "ADMIN" | "DOCTOR" | "RECEPTIONIST") => {
    setBusyId(userId)
    const res = await changeUserRole(userId, newRole)
    if (res.success) { toast.success("Rol actualizado"); router.refresh() }
    else toast.error("Error al cambiar el rol")
    setBusyId(null)
  }

  const handleResetPassword = async (userId: string) => {
    setBusyId(userId)
    const res = await resetUserPassword(userId)
    if (res.success) {
      navigator.clipboard.writeText(res.tempPassword).catch(() => {})
      toast.success(`Contraseña temporal: ${res.tempPassword} (copiada al portapapeles)`, { duration: 10000 })
    } else {
      toast.error("Error al resetear contraseña")
    }
    setBusyId(null)
  }

  const handleToggleActive = async (userId: string, currentActive: boolean) => {
    setBusyId(userId)
    const res = await toggleUserActive(userId, !currentActive)
    if (res.success) { toast.success(!currentActive ? "Usuario activado" : "Usuario desactivado"); router.refresh() }
    else toast.error("Error al cambiar estado")
    setBusyId(null)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-[16px] font-bold text-ink-primary">
          Usuarios <span className="text-ink-tertiary font-normal text-[14px]">({filtered.length})</span>
        </h2>
        <input
          type="search"
          placeholder="Buscar por nombre, email o clínica..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-64 text-[12px] border border-line-soft rounded-[8px] px-3 py-1.5 bg-surface text-ink-primary placeholder:text-ink-disabled focus:outline-none focus:border-brand-400"
        />
      </div>

      <div className="bg-surface border border-line-subtle rounded-[12px] overflow-hidden shadow-card">
        <div className="grid grid-cols-[2fr_1.5fr_1fr_1fr_1fr_180px] gap-0 px-4 py-2.5 border-b border-line-subtle bg-inset">
          {["Usuario", "Clínica", "Rol", "Estado", "Última conexión", ""].map((h) => (
            <p key={h} className="text-[11px] font-medium text-ink-tertiary uppercase tracking-[0.04em]">{h}</p>
          ))}
        </div>

        {filtered.map((user, i) => {
          const roleCfg = ROLE_LABELS[user.role] ?? ROLE_LABELS.RECEPTIONIST
          const busy = busyId === user.id

          return (
            <div
              key={user.id}
              className={cn(
                "grid grid-cols-[2fr_1.5fr_1fr_1fr_1fr_180px] gap-0 px-4 py-3 items-center",
                i < filtered.length - 1 && "border-b border-line-subtle",
                !user.isActive && "opacity-50"
              )}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center flex-shrink-0 text-[11px] font-semibold">
                  {user.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-[550] text-ink-primary truncate">{user.name}</p>
                  <p className="text-[11px] text-ink-tertiary truncate">{user.email}</p>
                </div>
              </div>

              <Link
                href={`/super-admin/clinics/${user.clinicId}`}
                className="text-[12px] text-ink-secondary hover:text-brand-600 hover:underline truncate"
              >
                {user.clinic.name}
                {user.clinic.suspendedAt && <span className="ml-1 text-[10px] text-red-500">(suspendida)</span>}
              </Link>

              <select
                value={user.role}
                disabled={busy}
                onChange={(e) => handleRoleChange(user.id, e.target.value as "ADMIN" | "DOCTOR" | "RECEPTIONIST")}
                className={cn("text-[11px] font-medium px-2 py-0.5 rounded-[4px] w-fit border-none focus:outline-none focus:ring-1 focus:ring-brand-400", roleCfg.color)}
              >
                <option value="ADMIN">Admin</option>
                <option value="DOCTOR">Doctor</option>
                <option value="RECEPTIONIST">Recepcionista</option>
              </select>

              <div className="flex items-center gap-1.5">
                {user.isActive
                  ? <><CheckCircle2 className="w-3.5 h-3.5 text-green-500" /><span className="text-[12px] text-green-600">Activo</span></>
                  : <><XCircle className="w-3.5 h-3.5 text-red-400" /><span className="text-[12px] text-red-500">Inactivo</span></>
                }
              </div>

              <span className="text-[12px] text-ink-tertiary">
                {user.lastLoginAt ? formatDistanceToNow(new Date(user.lastLoginAt), { addSuffix: true, locale: es }) : "Nunca"}
              </span>

              <div className="flex items-center gap-1.5 justify-end">
                <button
                  onClick={() => handleResetPassword(user.id)}
                  disabled={busy}
                  title="Resetear contraseña"
                  className="text-[11px] font-medium px-2 py-1 rounded-[6px] border border-line-soft text-ink-secondary hover:bg-inset transition-colors disabled:opacity-50"
                >
                  {busy ? "..." : "🔑"}
                </button>
                <button
                  onClick={() => handleToggleActive(user.id, user.isActive)}
                  disabled={busy}
                  className={cn(
                    "text-[11px] font-medium px-2.5 py-1 rounded-[6px] border transition-ui",
                    user.isActive ? "border-red-200 text-red-600 hover:bg-red-50" : "border-green-200 text-green-600 hover:bg-green-50"
                  )}
                >
                  {user.isActive ? "Desactivar" : "Activar"}
                </button>
              </div>
            </div>
          )
        })}

        {filtered.length === 0 && (
          <div className="px-4 py-8 text-center text-[13px] text-ink-tertiary">No se encontraron usuarios</div>
        )}
      </div>
    </div>
  )
}
