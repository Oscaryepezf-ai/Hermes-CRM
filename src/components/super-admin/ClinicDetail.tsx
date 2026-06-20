"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft, Building2, Users, TrendingUp, CalendarCheck,
  CheckCircle2, XCircle, Bot, MessageCircle, Camera,
  Clock, Crown, Stethoscope, User,
} from "lucide-react"
import { formatDistanceToNow, format } from "date-fns"
import { es } from "date-fns/locale"
import { cn } from "@/lib/utils"
import {
  toggleUserActive, updateClinicPlan, changeUserRole,
  resetUserPassword, suspendClinic, reactivateClinic,
} from "@/lib/actions/super-admin"
import { toast } from "sonner"

const PLAN_CONFIG: Record<string, { label: string; bg: string; text: string; price: number }> = {
  STARTER:     { label: "Starter",     bg: "#F0F2F6", text: "#4A5568", price: 49  },
  PROFESIONAL: { label: "Profesional", bg: "#EEF2FF", text: "#4338CA", price: 129 },
  CLINICA:     { label: "Élite",        bg: "#FFFBEB", text: "#92400E", price: 500 },
}

const ROLE_LABELS: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  ADMIN:        { label: "Admin",         icon: Crown,      color: "bg-violet-50 text-violet-700" },
  DOCTOR:       { label: "Doctor",        icon: Stethoscope, color: "bg-blue-50 text-blue-700"   },
  RECEPTIONIST: { label: "Recepcionista", icon: User,       color: "bg-teal-50 text-teal-700"    },
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function ClinicDetail({ clinic }: { clinic: any }) {
  const router = useRouter()
  const [togglingId, setTogglingId]   = useState<string | null>(null)
  const [updatingPlan, setUpdatingPlan] = useState(false)
  const [changingRoleId, setChangingRoleId] = useState<string | null>(null)
  const [resettingId, setResettingId] = useState<string | null>(null)
  const [suspending, setSuspending] = useState(false)
  const [suspendReason, setSuspendReason] = useState("")
  const [showSuspendForm, setShowSuspendForm] = useState(false)
  const planCfg = PLAN_CONFIG[clinic.plan] ?? PLAN_CONFIG.STARTER

  const handleToggleUser = async (userId: string, currentActive: boolean) => {
    setTogglingId(userId)
    const res = await toggleUserActive(userId, !currentActive)
    if (res.success) {
      toast.success(!currentActive ? "Usuario activado" : "Usuario desactivado")
      router.refresh()
    } else {
      toast.error("Error al cambiar estado")
    }
    setTogglingId(null)
  }

  const handlePlanChange = async (plan: "STARTER" | "PROFESIONAL" | "CLINICA") => {
    setUpdatingPlan(true)
    const res = await updateClinicPlan(clinic.id, plan)
    if (res.success) {
      toast.success("Plan actualizado")
      router.refresh()
    } else {
      toast.error("Error al actualizar plan")
    }
    setUpdatingPlan(false)
  }

  const handleRoleChange = async (userId: string, newRole: "ADMIN" | "DOCTOR" | "RECEPTIONIST") => {
    setChangingRoleId(userId)
    const res = await changeUserRole(userId, newRole)
    if (res.success) {
      toast.success("Rol actualizado")
      router.refresh()
    } else {
      toast.error("Error al cambiar el rol")
    }
    setChangingRoleId(null)
  }

  const handleResetPassword = async (userId: string) => {
    setResettingId(userId)
    const res = await resetUserPassword(userId)
    if (res.success) {
      navigator.clipboard.writeText(res.tempPassword).catch(() => {})
      toast.success(`Contraseña temporal: ${res.tempPassword} (copiada al portapapeles)`, { duration: 10000 })
    } else {
      toast.error("Error al resetear contraseña")
    }
    setResettingId(null)
  }

  const handleSuspendClinic = async () => {
    setSuspending(true)
    const res = await suspendClinic(clinic.id, suspendReason || "Sin motivo especificado")
    if (res.success) {
      toast.success("Clínica suspendida")
      setShowSuspendForm(false)
      router.refresh()
    } else {
      toast.error("Error al suspender")
    }
    setSuspending(false)
  }

  const handleReactivateClinic = async () => {
    setSuspending(true)
    const res = await reactivateClinic(clinic.id)
    if (res.success) {
      toast.success("Clínica reactivada")
      router.refresh()
    } else {
      toast.error("Error al reactivar")
    }
    setSuspending(false)
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Back */}
      <Link
        href="/super-admin"
        className="inline-flex items-center gap-1.5 text-[12px] text-ink-tertiary hover:text-ink-secondary transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Volver a Clínicas
      </Link>

      {/* Clinic header */}
      <div className="bg-surface border border-line-subtle rounded-[16px] p-5 shadow-card">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-[12px] bg-brand-100 flex items-center justify-center">
              <Building2 className="w-6 h-6 text-brand-600" />
            </div>
            <div>
              <h1 className="text-[20px] font-bold text-ink-primary leading-tight">{clinic.name}</h1>
              <p className="text-[12px] text-ink-tertiary mt-0.5">
                {clinic.country} · Registrada {format(new Date(clinic.createdAt), "d 'de' MMMM yyyy", { locale: es })}
              </p>
            </div>
          </div>

          {/* Plan selector */}
          <div className="flex-shrink-0 space-y-1.5">
            <p className="text-[11px] text-ink-tertiary font-medium uppercase tracking-[0.04em]">Plan</p>
            <div className="flex gap-2">
              {(["STARTER", "PROFESIONAL", "CLINICA"] as const).map(p => {
                const cfg = PLAN_CONFIG[p]
                const isActive = clinic.plan === p
                return (
                  <button
                    key={p}
                    onClick={() => !isActive && handlePlanChange(p)}
                    disabled={updatingPlan}
                    className={cn(
                      "text-[11px] font-medium px-2.5 py-1 rounded-[6px] border transition-ui",
                      isActive
                        ? "border-2 border-violet-400"
                        : "border-transparent hover:border-line-soft"
                    )}
                    style={{ background: cfg.bg, color: cfg.text }}
                  >
                    {cfg.label} · ${cfg.price}/mes
                  </button>
                )
              })}
            </div>
          </div>

          {/* Suspend / reactivate */}
          <div className="flex-shrink-0 space-y-1.5">
            <p className="text-[11px] text-ink-tertiary font-medium uppercase tracking-[0.04em]">Estado</p>
            {clinic.suspendedAt ? (
              <button
                onClick={handleReactivateClinic}
                disabled={suspending}
                className="text-[11px] font-medium px-2.5 py-1 rounded-[6px] border border-green-200 text-green-700 bg-green-50 hover:bg-green-100 transition-colors disabled:opacity-50"
              >
                Reactivar clínica
              </button>
            ) : showSuspendForm ? (
              <div className="flex items-center gap-1.5">
                <input
                  autoFocus
                  placeholder="Motivo..."
                  value={suspendReason}
                  onChange={(e) => setSuspendReason(e.target.value)}
                  className="w-32 h-7 px-2 text-[11px] border border-line-soft rounded-[6px] bg-surface focus:outline-none focus:border-brand-400"
                />
                <button
                  onClick={handleSuspendClinic}
                  disabled={suspending}
                  className="text-[11px] font-medium px-2 py-1 rounded-[6px] bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                >
                  Confirmar
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowSuspendForm(true)}
                className="text-[11px] font-medium px-2.5 py-1 rounded-[6px] border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 transition-colors"
              >
                Suspender clínica
              </button>
            )}
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-3 mt-4 pt-4 border-t border-line-subtle">
          <MiniStat icon={Users}        label="Usuarios"    value={String(clinic._count.users)}       />
          <MiniStat icon={TrendingUp}   label="Leads"       value={String(clinic._count.leads)}       />
          <MiniStat icon={CalendarCheck} label="Citas"      value={String(clinic._count.appointments)} />
          <div className="flex items-center gap-2">
            <div className="space-y-1">
              <p className="text-[11px] text-ink-tertiary uppercase tracking-[0.04em]">Canales activos</p>
              <div className="flex items-center gap-1.5">
                <span className={cn("flex items-center gap-1 text-[11px] font-medium px-1.5 py-0.5 rounded-[4px]",
                  clinic.captadorActive ? "bg-violet-50 text-violet-700" : "bg-inset text-ink-disabled")}>
                  <Bot className="w-3 h-3" /> Captador
                </span>
                <span className={cn("flex items-center gap-1 text-[11px] font-medium px-1.5 py-0.5 rounded-[4px]",
                  clinic.messengerActive ? "bg-blue-50 text-blue-700" : "bg-inset text-ink-disabled")}>
                  <MessageCircle className="w-3 h-3" /> Messenger
                </span>
                <span className={cn("flex items-center gap-1 text-[11px] font-medium px-1.5 py-0.5 rounded-[4px]",
                  clinic.instagramActive ? "bg-pink-50 text-pink-700" : "bg-inset text-ink-disabled")}>
                  <Camera className="w-3 h-3" /> Instagram
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Users table */}
      <div className="space-y-3">
        <h2 className="text-[15px] font-bold text-ink-primary">
          Usuarios <span className="text-ink-tertiary font-normal text-[13px]">({clinic.users.length})</span>
        </h2>

        <div className="bg-surface border border-line-subtle rounded-[12px] overflow-hidden shadow-card">
          {/* Header */}
          <div className="grid grid-cols-[2fr_1fr_1fr_1fr_180px] px-4 py-2.5 border-b border-line-subtle bg-inset">
            {["Usuario", "Rol", "Estado", "Última conexión", ""].map(h => (
              <p key={h} className="text-[11px] font-medium text-ink-tertiary uppercase tracking-[0.04em]">{h}</p>
            ))}
          </div>

          {clinic.users.map((user: any, i: number) => {
            const roleCfg = ROLE_LABELS[user.role] ?? ROLE_LABELS.RECEPTIONIST
            const isToggling = togglingId === user.id
            const isChangingRole = changingRoleId === user.id
            const isResetting = resettingId === user.id

            return (
              <div
                key={user.id}
                className={cn(
                  "grid grid-cols-[2fr_1fr_1fr_1fr_180px] px-4 py-3 items-center",
                  i < clinic.users.length - 1 && "border-b border-line-subtle",
                  !user.isActive && "opacity-50"
                )}
              >
                {/* User info */}
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-[11px] font-semibold",
                    user.isActive ? "bg-brand-100 text-brand-700" : "bg-inset text-ink-disabled"
                  )}>
                    {user.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-[550] text-ink-primary truncate">{user.name}</p>
                    <p className="text-[11px] text-ink-tertiary truncate">{user.email}</p>
                  </div>
                </div>

                {/* Role */}
                <select
                  value={user.role}
                  disabled={isChangingRole}
                  onChange={(e) => handleRoleChange(user.id, e.target.value as "ADMIN" | "DOCTOR" | "RECEPTIONIST")}
                  className={cn("text-[11px] font-medium px-2 py-0.5 rounded-[4px] w-fit border-none focus:outline-none focus:ring-1 focus:ring-brand-400", roleCfg.color)}
                >
                  <option value="ADMIN">Admin</option>
                  <option value="DOCTOR">Doctor</option>
                  <option value="RECEPTIONIST">Recepcionista</option>
                </select>

                {/* Status */}
                <div className="flex items-center gap-1.5">
                  {user.isActive
                    ? <><CheckCircle2 className="w-3.5 h-3.5 text-green-500" /><span className="text-[12px] text-green-600">Activo</span></>
                    : <><XCircle     className="w-3.5 h-3.5 text-red-400"  /><span className="text-[12px] text-red-500">Inactivo</span></>
                  }
                </div>

                {/* Last login */}
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3 h-3 text-ink-disabled flex-shrink-0" />
                  <span className="text-[12px] text-ink-tertiary">
                    {user.lastLoginAt
                      ? formatDistanceToNow(new Date(user.lastLoginAt), { addSuffix: true, locale: es })
                      : "Nunca"}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 justify-end">
                  <button
                    onClick={() => handleResetPassword(user.id)}
                    disabled={isResetting}
                    title="Resetear contraseña"
                    className="text-[11px] font-medium px-2 py-1 rounded-[6px] border border-line-soft text-ink-secondary hover:bg-inset transition-colors disabled:opacity-50"
                  >
                    {isResetting ? "..." : "🔑"}
                  </button>
                  <button
                    onClick={() => handleToggleUser(user.id, user.isActive)}
                    disabled={isToggling}
                    className={cn(
                      "text-[11px] font-medium px-2.5 py-1 rounded-[6px] border transition-ui",
                      user.isActive
                        ? "border-red-200 text-red-600 hover:bg-red-50"
                        : "border-green-200 text-green-600 hover:bg-green-50"
                    )}
                  >
                    {isToggling ? "..." : user.isActive ? "Desactivar" : "Activar"}
                  </button>
                </div>
              </div>
            )
          })}

          {clinic.users.length === 0 && (
            <div className="px-4 py-8 text-center text-[13px] text-ink-tertiary">
              Sin usuarios registrados
            </div>
          )}
        </div>
      </div>

      {/* Recent leads */}
      {clinic.leads.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-[15px] font-bold text-ink-primary">Leads recientes</h2>
          <div className="bg-surface border border-line-subtle rounded-[12px] overflow-hidden shadow-card">
            {clinic.leads.slice(0, 5).map((lead: any, i: number) => (
              <div key={lead.id} className={cn("flex items-center justify-between px-4 py-2.5", i < 4 && "border-b border-line-subtle")}>
                <div className="flex items-center gap-3">
                  <span className="text-[11px] font-medium px-1.5 py-0.5 rounded-[4px] bg-inset text-ink-secondary">
                    {lead.channel}
                  </span>
                  <span className="text-[11px] font-medium px-1.5 py-0.5 rounded-[4px] bg-inset text-ink-secondary">
                    {lead.journeyState}
                  </span>
                </div>
                <span className="text-[11px] text-ink-tertiary">
                  {formatDistanceToNow(new Date(lead.createdAt), { addSuffix: true, locale: es })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function MiniStat({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] text-ink-tertiary uppercase tracking-[0.04em] mb-1">{label}</p>
      <div className="flex items-center gap-1.5">
        <Icon className="w-3.5 h-3.5 text-ink-tertiary" />
        <span className="text-[18px] font-bold text-ink-primary tabular-nums">{value}</span>
      </div>
    </div>
  )
}
