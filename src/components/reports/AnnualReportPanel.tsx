"use client"

import { useRouter, usePathname } from "next/navigation"
import { formatCurrency } from "@/lib/utils"

const CATEGORY_LABELS: Record<string, string> = {
  INSUMOS: "Insumos", ARRIENDO: "Arriendo", NOMINA: "Nómina",
  SERVICIOS_BASICOS: "Servicios básicos", MARKETING: "Marketing", EQUIPAMIENTO: "Equipamiento", OTRO: "Otro",
}

type Props = {
  year: number
  monthlyRows: { month: string; ingreso: number; egreso: number; utilidad: number }[]
  expensesByCategory: { label: string; value: number }[]
  summary: { totalIngreso: number; totalEgreso: number; utilidad: number }
  topPatients: { name: string; total: number }[]
}

export function AnnualReportPanel({ year, monthlyRows, expensesByCategory, summary, topPatients }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const years = [year - 1, year, year + 1]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[12px] text-ink-tertiary bg-inset rounded-[8px] px-3 py-2">Los reportes se muestran en USD.</p>
        <select
          value={year}
          onChange={(e) => router.push(`${pathname}?year=${e.target.value}`)}
          className="h-8 px-2.5 text-[12px] border border-line-soft rounded-[6px] bg-surface"
        >
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-[1.6fr_1fr] gap-4">
        <div className="space-y-4">
          <div className="bg-surface border border-line-subtle rounded-[12px] overflow-hidden shadow-card">
            <p className="text-sm font-semibold text-ink-secondary px-4 py-3 border-b border-line-subtle">Ingresos y egresos</p>
            <div className="grid grid-cols-4 px-4 py-2 border-b border-line-subtle bg-inset">
              {["Mes", "Ingreso", "Egreso", "Utilidad"].map((h) => (
                <p key={h} className="text-[10.5px] font-medium text-ink-tertiary uppercase tracking-[0.03em]">{h}</p>
              ))}
            </div>
            {monthlyRows.map((row, i) => (
              <div key={row.month} className={`grid grid-cols-4 px-4 py-2 text-[12px] ${i < monthlyRows.length - 1 ? "border-b border-line-subtle" : ""}`}>
                <span className="capitalize text-ink-secondary">{row.month}</span>
                <span className="text-ink-primary tabular-nums">{formatCurrency(row.ingreso)}</span>
                <span className="text-red-500 tabular-nums">{formatCurrency(row.egreso)}</span>
                <span className={`font-medium tabular-nums ${row.utilidad >= 0 ? "text-green-600" : "text-red-500"}`}>{formatCurrency(row.utilidad)}</span>
              </div>
            ))}
          </div>

          <div className="bg-surface border border-line-subtle rounded-[12px] overflow-hidden shadow-card">
            <p className="text-sm font-semibold text-ink-secondary px-4 py-3 border-b border-line-subtle">Egresos por categoría</p>
            {expensesByCategory.length === 0 ? (
              <p className="text-[12px] text-ink-disabled text-center py-6">Sin egresos registrados este año</p>
            ) : (
              expensesByCategory.map((e, i) => (
                <div key={e.label} className={`flex items-center justify-between px-4 py-2.5 text-[12px] ${i < expensesByCategory.length - 1 ? "border-b border-line-subtle" : ""}`}>
                  <span className="text-ink-secondary">{CATEGORY_LABELS[e.label] ?? e.label}</span>
                  <span className="font-medium text-ink-primary tabular-nums">{formatCurrency(e.value)}</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-surface border border-line-subtle rounded-[12px] p-4 shadow-card">
            <p className="text-sm font-semibold text-ink-secondary mb-3">Resumen {year}</p>
            <div className="grid grid-cols-2 gap-3">
              <MiniStat label="Ingreso" value={formatCurrency(summary.totalIngreso)} />
              <MiniStat label="Egresos" value={formatCurrency(summary.totalEgreso)} />
              <MiniStat label="Utilidad" value={formatCurrency(summary.utilidad)} highlight={summary.utilidad >= 0} />
            </div>
          </div>

          <div className="bg-surface border border-line-subtle rounded-[12px] p-4 shadow-card">
            <p className="text-sm font-semibold text-ink-secondary mb-1">Top 10 de pacientes</p>
            <p className="text-[11px] text-ink-tertiary mb-3">Pacientes que te generaron más ventas este {year}</p>
            {topPatients.length === 0 ? (
              <p className="text-[12px] text-ink-disabled text-center py-6">Sin pagos registrados este año</p>
            ) : (
              <div className="space-y-2">
                {topPatients.map((p, i) => (
                  <div key={p.name + i} className="flex items-center justify-between text-[12px]">
                    <span className="text-ink-secondary truncate">{i + 1}. {p.name}</span>
                    <span className="font-medium text-ink-primary tabular-nums">{formatCurrency(p.total)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function MiniStat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <p className="text-[11px] text-ink-tertiary">{label}</p>
      <p className={`text-[16px] font-bold tabular-nums ${highlight === false ? "text-red-500" : "text-ink-primary"}`}>{value}</p>
    </div>
  )
}
