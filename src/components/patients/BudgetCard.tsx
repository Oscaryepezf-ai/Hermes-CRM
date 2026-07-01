"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { FileText, Download, Pencil, Trash2, ChevronDown, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { updateBudgetStatus, deleteBudget } from "@/lib/actions/budgets"
import type { BudgetStatus } from "@prisma/client"

const STATUS_CONFIG: Record<BudgetStatus, { label: string; color: string }> = {
  BORRADOR:  { label: "Borrador",  color: "bg-gray-100 text-gray-600" },
  ENVIADO:   { label: "Enviado",   color: "bg-blue-100 text-blue-700" },
  ACEPTADO:  { label: "Aceptado",  color: "bg-green-100 text-green-700" },
  RECHAZADO: { label: "Rechazado", color: "bg-red-100 text-red-700" },
  VENCIDO:   { label: "Vencido",   color: "bg-amber-100 text-amber-700" },
}

type BudgetForCard = {
  id:          string
  number:      number
  status:      BudgetStatus
  total:       number
  subtotal:    number
  discountPct: number
  createdAt:   Date | string
  validUntil:  Date | string | null
  notes:       string | null
  doctorId:    string | null
  doctor:      { name: string } | null
  items: {
    description: string
    quantity:    number
    unitPrice:   number
    discount:    number
    total:       number
    serviceId:   string | null
  }[]
}

type ClinicInfo = {
  name: string; logoUrl: string | null; phone: string | null; address: string | null; city: string | null
}
type LeadInfo  = { fullName: string; phone: string; email: string | null }

interface BudgetCardProps {
  budget:   BudgetForCard
  clinic:   ClinicInfo
  lead:     LeadInfo
  canEdit:  boolean
  onEdit:   (budget: BudgetForCard) => void
}

export function BudgetCard({ budget, clinic, lead, canEdit, onEdit }: BudgetCardProps) {
  const router   = useRouter()
  const [isPending, startTransition] = useTransition()
  const [menuOpen, setMenuOpen] = useState(false)

  const cfg = STATUS_CONFIG[budget.status]
  const fmtCurrency = (v: number) =>
    v.toLocaleString("es-EC", { style: "currency", currency: "USD", minimumFractionDigits: 2 })
  const fmtDate = (d: Date | string) => new Date(d).toLocaleDateString("es-EC", { day: "2-digit", month: "short", year: "numeric" })

  async function downloadPDF() {
    const { generateBudgetPDF } = await import("@/lib/pdf/budget-pdf")
    await generateBudgetPDF(
      { ...budget, createdAt: new Date(budget.createdAt), validUntil: budget.validUntil ? new Date(budget.validUntil) : null },
      clinic,
      lead
    )
  }

  function changeStatus(status: BudgetStatus) {
    setMenuOpen(false)
    startTransition(async () => {
      const result = await updateBudgetStatus(budget.id, status)
      if (result.success) { toast.success("Estado actualizado"); router.refresh() }
      else toast.error(result.error)
    })
  }

  function handleDelete() {
    if (!confirm("¿Eliminar este presupuesto? Esta acción no se puede deshacer.")) return
    startTransition(async () => {
      const result = await deleteBudget(budget.id)
      if (result.success) { toast.success("Presupuesto eliminado"); router.refresh() }
      else toast.error(result.error)
    })
  }

  const NEXT_STATUSES: Partial<Record<BudgetStatus, BudgetStatus[]>> = {
    BORRADOR:  ["ENVIADO"],
    ENVIADO:   ["ACEPTADO", "RECHAZADO"],
    ACEPTADO:  ["VENCIDO"],
    RECHAZADO: [],
    VENCIDO:   [],
  }
  const nextStatuses = NEXT_STATUSES[budget.status] ?? []

  return (
    <div className="bg-surface border border-line-subtle rounded-[12px] shadow-card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-line-subtle">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-brand-50 flex items-center justify-center flex-shrink-0">
            <FileText className="w-4 h-4 text-brand-600" />
          </div>
          <div>
            <p className="text-[13px] font-semibold text-ink-primary">
              Presupuesto #{String(budget.number).padStart(3, "0")}
            </p>
            <p className="text-[11px] text-ink-tertiary">
              {fmtDate(budget.createdAt)} {budget.doctor && `· ${budget.doctor.name}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn("text-[11px] font-semibold px-2 py-0.5 rounded-full", cfg.color)}>{cfg.label}</span>
          <span className="text-[14px] font-bold text-ink-primary">{fmtCurrency(budget.total)}</span>
        </div>
      </div>

      {/* Items preview */}
      <div className="px-4 py-2.5 space-y-1">
        {budget.items.slice(0, 3).map((it, i) => (
          <div key={i} className="flex items-center justify-between">
            <span className="text-[12px] text-ink-secondary truncate flex-1">{it.quantity}× {it.description}</span>
            <span className="text-[12px] font-medium text-ink-primary ml-2">{fmtCurrency(it.total)}</span>
          </div>
        ))}
        {budget.items.length > 3 && (
          <p className="text-[11px] text-ink-disabled">+{budget.items.length - 3} más…</p>
        )}
        {budget.discountPct > 0 && (
          <p className="text-[11px] text-ink-tertiary">Descuento global {budget.discountPct}%</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 px-4 py-2.5 border-t border-line-subtle">
        <button
          type="button"
          onClick={downloadPDF}
          className="flex items-center gap-1.5 text-[11px] font-medium text-ink-secondary hover:text-brand-600 px-2 py-1 rounded-lg hover:bg-brand-50 transition-ui"
        >
          <Download className="w-3.5 h-3.5" /> Descargar PDF
        </button>

        {canEdit && budget.status === "BORRADOR" && (
          <button
            type="button"
            onClick={() => onEdit(budget)}
            className="flex items-center gap-1.5 text-[11px] font-medium text-ink-secondary hover:text-brand-600 px-2 py-1 rounded-lg hover:bg-brand-50 transition-ui"
          >
            <Pencil className="w-3.5 h-3.5" /> Editar
          </button>
        )}

        {canEdit && nextStatuses.length > 0 && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen(v => !v)}
              disabled={isPending}
              className="flex items-center gap-1 text-[11px] font-medium text-ink-secondary hover:text-brand-600 px-2 py-1 rounded-lg hover:bg-brand-50 transition-ui disabled:opacity-40"
            >
              {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <ChevronDown className="w-3 h-3" />}
              Cambiar estado
            </button>
            {menuOpen && (
              <div className="absolute left-0 bottom-8 w-44 bg-popover rounded-xl shadow-xl ring-1 ring-foreground/10 z-50 py-1">
                {nextStatuses.map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => changeStatus(s)}
                    className={cn("w-full text-left text-[12px] font-medium px-3 py-2 hover:bg-inset transition-ui", STATUS_CONFIG[s].color.replace("bg-", "hover:bg-").replace("-100", "-50"))}
                  >
                    Marcar como "{STATUS_CONFIG[s].label}"
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {canEdit && budget.status === "BORRADOR" && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={isPending}
            className="flex items-center gap-1.5 text-[11px] font-medium text-ink-tertiary hover:text-red-500 px-2 py-1 rounded-lg hover:bg-red-50 transition-ui ml-auto"
          >
            <Trash2 className="w-3.5 h-3.5" /> Eliminar
          </button>
        )}
      </div>
    </div>
  )
}
