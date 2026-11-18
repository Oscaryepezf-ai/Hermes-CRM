import Link from "next/link"
import { format } from "date-fns"
import { DollarSign, Target, CalendarCheck, Wallet, Settings2 } from "lucide-react"
import { requirePermission } from "@/lib/rbac/guards"
import { parsePeriodParams } from "@/lib/reports/period"
import { getCohortMetrics, getActivityMetrics, formatMetric } from "@/lib/growth/metrics"
import { MetricCard } from "@/components/dashboard/MetricCard"
import { PeriodSelector } from "@/components/reports/PeriodSelector"
import { RestrictedAccess } from "@/components/reports/RestrictedAccess"
import { ViewToggle } from "@/components/growth/ViewToggle"
import { FunnelCard } from "@/components/growth/FunnelCard"
import { ChannelBreakdownTable } from "@/components/growth/ChannelBreakdownTable"

type SearchParams = { from?: string; to?: string; view?: string }

export default async function CrecimientoPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const guard = await requirePermission("ad_spend", "view")
  if (!guard.authorized) return <RestrictedAccess />

  const params = await searchParams
  const period = parsePeriodParams(params)
  const view = params.view === "activity" ? "activity" : "cohort"

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3 flex-wrap">
          <ViewToggle view={view} />
          <PeriodSelector from={format(period.start, "yyyy-MM-dd")} to={format(period.end, "yyyy-MM-dd")} />
        </div>
        <Link
          href="/crecimiento/campanas"
          className="flex items-center gap-1.5 text-[12px] font-medium px-3 py-1.5 rounded-[6px] border border-line-soft text-ink-secondary hover:bg-inset transition-colors"
        >
          <Settings2 className="w-3.5 h-3.5" />
          Campañas e inversión
        </Link>
      </div>

      {view === "cohort" ? (
        <CohortView clinicId={guard.user.clinicId} period={period} />
      ) : (
        <ActivityView clinicId={guard.user.clinicId} period={period} />
      )}
    </div>
  )
}

async function CohortView({
  clinicId,
  period,
}: {
  clinicId: string
  period: { start: Date; end: Date }
}) {
  const m = await getCohortMetrics(clinicId, period)

  return (
    <div className="space-y-4">
      <p className="text-[12px] text-ink-tertiary">
        Contactos que ingresaron en este rango y su avance, sin importar cuándo ocurrió cada paso siguiente.
      </p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <MetricCard title="Inversión total" value={formatMetric(m.totalSpend, "currency")} icon={DollarSign} />
        <MetricCard title="CPL" value={formatMetric(m.cpl, "currency")} subtitle={`${m.cohortSize} contactos`} icon={Target} />
        <MetricCard title="CPA paciente nuevo" value={formatMetric(m.cpa, "currency")} subtitle={`${m.treatmentStartedCount} iniciaron tratamiento`} icon={Wallet} />
        <MetricCard title="Cobros netos" value={formatMetric(m.netCollections, "currency")} icon={CalendarCheck} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
        <FunnelCard
          stages={[
            { label: "Contactos", count: m.cohortSize, rate: null },
            { label: "Agendaron cita", count: m.scheduledCount, rate: m.schedulingRate },
            { label: "Asistieron", count: m.attendedCount, rate: m.attendanceRate },
            { label: "Iniciaron tratamiento", count: m.treatmentStartedCount, rate: m.startRate },
          ]}
        />
        <ChannelBreakdownTable rows={m.byChannel} />
      </div>
    </div>
  )
}

async function ActivityView({
  clinicId,
  period,
}: {
  clinicId: string
  period: { start: Date; end: Date }
}) {
  const m = await getActivityMetrics(clinicId, period)

  return (
    <div className="space-y-4">
      <p className="text-[12px] text-ink-tertiary">
        Eventos ocurridos en este rango — gasto registrado y pagos cobrados estos días, sin importar cuándo ingresó el contacto.
      </p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <MetricCard title="Inversión del periodo" value={formatMetric(m.totalSpend, "currency")} icon={DollarSign} />
        <MetricCard title="Cobros brutos" value={formatMetric(m.grossPayments, "currency")} icon={Wallet} />
        <MetricCard title="Devoluciones" value={formatMetric(m.refunds, "currency")} icon={Wallet} />
        <MetricCard title="Cobros netos" value={formatMetric(m.netCollections, "currency")} icon={CalendarCheck} />
      </div>
      <MetricCard
        title="CPA paciente nuevo (del periodo)"
        value={formatMetric(m.cpa, "currency")}
        subtitle={`${m.newPatientsStartedCount} pacientes iniciaron tratamiento en el rango`}
        icon={Target}
      />
    </div>
  )
}
