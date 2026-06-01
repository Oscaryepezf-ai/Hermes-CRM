import { redirect } from "next/navigation"
import { auth } from "../../../../auth"
import { getPlatformMetrics, getAllClinics } from "@/lib/actions/super-admin"
import { PlatformShell } from "@/components/super-admin/PlatformShell"
import { ClinicsTable } from "@/components/super-admin/ClinicsTable"
import {
  Building2, Users, TrendingUp, DollarSign, Bot, Radio,
} from "lucide-react"

const PLAN_LABELS: Record<string, { label: string; color: string; price: number }> = {
  STARTER:     { label: "Starter",      color: "bg-slate-100 text-slate-700",   price: 49  },
  PROFESIONAL: { label: "Profesional",  color: "bg-brand-50 text-brand-700",    price: 129 },
  CLINICA:     { label: "Élite",         color: "bg-amber-50 text-amber-700",    price: 500 },
}

export default async function SuperAdminPage() {
  const session = await auth()
  const user = session?.user as any
  if (!user?.isSuperAdmin) redirect("/dashboard")

  const [metricsRes, clinicsRes] = await Promise.all([
    getPlatformMetrics(),
    getAllClinics(),
  ])

  const metrics = metricsRes.success ? metricsRes.data : null
  const clinics = clinicsRes.success ? clinicsRes.data : []

  return (
    <PlatformShell adminName={session!.user.name ?? "Admin"}>
      <div className="space-y-6 max-w-7xl">
        {/* Header */}
        <div>
          <h1 className="text-[20px] font-bold text-ink-primary leading-tight">
            Panel de Control
          </h1>
          <p className="text-[13px] text-ink-tertiary mt-0.5">
            Vista global de todos los clientes y usuarios de la plataforma
          </p>
        </div>

        {/* Metrics */}
        {metrics && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard icon={Building2} label="Clínicas activas" value={String(metrics.clinics)} color="bg-violet-50 text-violet-600" />
            <StatCard icon={Users}     label="Usuarios totales" value={String(metrics.users)}   color="bg-brand-50 text-brand-600"  />
            <StatCard icon={TrendingUp} label="Leads en pipeline" value={String(metrics.leads)} color="bg-teal-50 text-teal-600"    />
            <StatCard
              icon={DollarSign}
              label="MRR estimado"
              value={`$${metrics.mrr.toLocaleString()} USD`}
              color="bg-green-50 text-green-600"
            />
          </div>
        )}

        {/* Plan breakdown */}
        {metrics && (
          <div className="grid grid-cols-3 gap-4">
            {metrics.planBreakdown.map(p => {
              const cfg = PLAN_LABELS[p.plan] ?? { label: p.plan, color: "bg-inset text-ink-secondary", price: 0 }
              return (
                <div key={p.plan} className="bg-surface border border-line-subtle rounded-[12px] p-4 shadow-card">
                  <div className="flex items-center justify-between mb-3">
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-[4px] ${cfg.color}`}>
                      {cfg.label}
                    </span>
                    <span className="text-[12px] text-ink-tertiary">${cfg.price}/mes</span>
                  </div>
                  <p className="text-[28px] font-bold text-ink-primary tabular-nums">{p._count.id}</p>
                  <p className="text-[12px] text-ink-tertiary mt-0.5">
                    clínicas · ${(p._count.id * cfg.price).toLocaleString()} USD/mes
                  </p>
                </div>
              )
            })}
          </div>
        )}

        {/* Clinics table */}
        <ClinicsTable clinics={clinics} />
      </div>
    </PlatformShell>
  )
}

function StatCard({ icon: Icon, label, value, color }: {
  icon: React.ElementType; label: string; value: string; color: string
}) {
  return (
    <div className="bg-surface border border-line-subtle rounded-[12px] p-4 shadow-card">
      <div className={`w-8 h-8 rounded-[8px] flex items-center justify-center mb-2.5 ${color.split(" ")[0]}`}>
        <Icon className={`w-4 h-4 ${color.split(" ")[1]}`} />
      </div>
      <p className="text-[22px] font-bold text-ink-primary tabular-nums leading-tight">{value}</p>
      <p className="text-[12px] text-ink-tertiary mt-0.5">{label}</p>
    </div>
  )
}
