"use client"

import { useState } from "react"
import { Plus, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { BudgetCard } from "./BudgetCard"
import { BudgetEditor } from "./BudgetEditor"
import type { BudgetStatus } from "@prisma/client"

type BudgetItem = {
  description: string; quantity: number; unitPrice: number; discount: number; total: number; serviceId: string | null
}

type Budget = {
  id: string; number: number; status: BudgetStatus; total: number; subtotal: number
  discountPct: number; createdAt: Date | string; validUntil: Date | string | null
  notes: string | null; doctorId: string | null; doctor: { name: string } | null; items: BudgetItem[]
}

interface PresupuestosTabProps {
  leadId:   string
  budgets:  Budget[]
  doctors:  { id: string; name: string }[]
  clinic:   { name: string; logoUrl: string | null; phone: string | null; address: string | null; city: string | null }
  lead:     { fullName: string; phone: string; email: string | null }
  canEdit:  boolean
}

export function PresupuestosTab({ leadId, budgets, doctors, clinic, lead, canEdit }: PresupuestosTabProps) {
  const [showEditor, setShowEditor] = useState(false)
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null)

  function openNew() {
    setEditingBudget(null)
    setShowEditor(true)
  }

  function openEdit(budget: Budget) {
    setEditingBudget(budget)
    setShowEditor(true)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-[14px] font-bold text-ink-primary">Presupuestos</h3>
          <p className="text-[12px] text-ink-tertiary mt-0.5">{budgets.length} presupuesto{budgets.length !== 1 ? "s" : ""}</p>
        </div>
        {canEdit && (
          <Button type="button" size="sm" onClick={openNew}>
            <Plus className="w-3.5 h-3.5" /> Nuevo presupuesto
          </Button>
        )}
      </div>

      {budgets.length === 0 ? (
        <div className="bg-surface border border-line-subtle rounded-[12px] p-10 flex flex-col items-center text-center gap-3 shadow-card">
          <div className="w-12 h-12 rounded-full bg-brand-50 flex items-center justify-center">
            <FileText className="w-6 h-6 text-brand-400" />
          </div>
          <p className="text-[13px] text-ink-tertiary">Aún no hay presupuestos para este paciente.</p>
          {canEdit && (
            <Button type="button" size="sm" onClick={openNew}>
              <Plus className="w-3.5 h-3.5" /> Crear primer presupuesto
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {budgets.map(b => (
            <BudgetCard
              key={b.id}
              budget={b}
              clinic={clinic}
              lead={lead}
              canEdit={canEdit}
              onEdit={openEdit}
            />
          ))}
        </div>
      )}

      {showEditor && (
        <BudgetEditor
          leadId={leadId}
          doctors={doctors}
          budget={editingBudget ?? undefined}
          onClose={() => { setShowEditor(false); setEditingBudget(null) }}
        />
      )}
    </div>
  )
}
