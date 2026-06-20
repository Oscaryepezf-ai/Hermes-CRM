"use client"

import { useState } from "react"
import { Plus } from "lucide-react"
import { PaymentFormModal } from "./PaymentFormModal"
import { ExpenseFormModal } from "./ExpenseFormModal"

export function ReportActionButtons() {
  const [modal, setModal] = useState<"payment" | "expense" | null>(null)

  return (
    <>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setModal("payment")}
          className="flex items-center gap-1.5 text-[12px] font-medium px-3 py-1.5 rounded-[8px] bg-brand-600 text-white hover:bg-brand-700 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> Registrar pago
        </button>
        <button
          onClick={() => setModal("expense")}
          className="flex items-center gap-1.5 text-[12px] font-medium px-3 py-1.5 rounded-[8px] border border-line-soft text-ink-secondary hover:bg-inset transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> Registrar egreso
        </button>
      </div>
      {modal === "payment" && <PaymentFormModal onClose={() => setModal(null)} />}
      {modal === "expense" && <ExpenseFormModal onClose={() => setModal(null)} />}
    </>
  )
}
