"use client"

import { useState } from "react"
import { Settings2 } from "lucide-react"
import { formatCurrency } from "@/lib/utils"
import { ServiceManagerModal } from "./ServiceManagerModal"
import type { DentalTreatment } from "@prisma/client"

const CATEGORY_LABELS: Record<string, string> = {
  ORTODONCIA: "Ortodoncia", IMPLANTES: "Implantes", BLANQUEAMIENTO: "Blanqueamiento",
  ENDODONCIA: "Endodoncia", LIMPIEZA: "Limpieza", CIRUGIA: "Cirugía", PROTESIS: "Prótesis", OTRO: "Otro",
}

type Row = { label: string; income: number; count: number }
type Service = { id: string; name: string; category: DentalTreatment; defaultPrice: number }

export function ServicesSoldPanel({ byService, byCategory, services }: { byService: Row[]; byCategory: Row[]; services: Service[] }) {
  const [showManager, setShowManager] = useState(false)
  const [mode, setMode] = useState<"income" | "count">("income")

  const maxService = Math.max(...byService.map((r) => (mode === "income" ? r.income : r.count)), 1)
  const maxCategory = Math.max(...byCategory.map((r) => (mode === "income" ? r.income : r.count)), 1)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 bg-inset rounded-[8px] p-0.5">
          <button
            onClick={() => setMode("income")}
            className={`text-[12px] font-medium px-2.5 py-1 rounded-[6px] ${mode === "income" ? "bg-surface shadow-card text-ink-primary" : "text-ink-tertiary"}`}
          >
            Ingresos
          </button>
          <button
            onClick={() => setMode("count")}
            className={`text-[12px] font-medium px-2.5 py-1 rounded-[6px] ${mode === "count" ? "bg-surface shadow-card text-ink-primary" : "text-ink-tertiary"}`}
          >
            Cantidad
          </button>
        </div>
        <button
          onClick={() => setShowManager(true)}
          className="flex items-center gap-1.5 text-[12px] font-medium px-3 py-1.5 rounded-[8px] border border-line-soft text-ink-secondary hover:bg-inset transition-colors"
        >
          <Settings2 className="w-3.5 h-3.5" /> Gestionar servicios
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <BarList title="Por servicio" rows={byService} max={maxService} mode={mode} />
        <BarList title="Por categoría" rows={byCategory.map((r) => ({ ...r, label: CATEGORY_LABELS[r.label] ?? r.label }))} max={maxCategory} mode={mode} />
      </div>

      {showManager && <ServiceManagerModal services={services} onClose={() => setShowManager(false)} />}
    </div>
  )
}

function BarList({ title, rows, max, mode }: { title: string; rows: Row[]; max: number; mode: "income" | "count" }) {
  return (
    <div className="bg-surface border border-line-subtle rounded-[12px] p-4 shadow-card">
      <p className="text-sm font-semibold text-ink-secondary mb-3">{title}</p>
      {rows.length === 0 ? (
        <p className="text-[12px] text-ink-disabled text-center py-10">Sin información en este período</p>
      ) : (
        <div className="space-y-2.5">
          {rows.map((r) => {
            const value = mode === "income" ? r.income : r.count
            const pct = Math.round((value / max) * 100)
            return (
              <div key={r.label}>
                <div className="flex items-center justify-between text-[12px] mb-1">
                  <span className="text-ink-secondary truncate">{r.label}</span>
                  <span className="font-medium text-ink-primary tabular-nums">
                    {mode === "income" ? formatCurrency(value) : value}
                  </span>
                </div>
                <div className="h-1.5 bg-brand-100 rounded-full overflow-hidden">
                  <div className="h-full bg-brand-500 rounded-full" style={{ width: `${pct}%` }} />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
