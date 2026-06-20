"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { X } from "lucide-react"
import { toast } from "sonner"
import { registerExpense } from "@/lib/actions/expenses"
import type { ExpenseCategory } from "@prisma/client"

const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  INSUMOS: "Insumos",
  ARRIENDO: "Arriendo",
  NOMINA: "Nómina",
  SERVICIOS_BASICOS: "Servicios básicos",
  MARKETING: "Marketing",
  EQUIPAMIENTO: "Equipamiento",
  OTRO: "Otro",
}

export function ExpenseFormModal({ onClose }: { onClose: () => void }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    category: "INSUMOS" as ExpenseCategory,
    description: "",
    amount: "",
    expenseDate: new Date().toISOString().slice(0, 10),
  })

  const handleSubmit = async () => {
    if (!form.description || !form.amount) {
      toast.error("Completa los campos obligatorios")
      return
    }
    setLoading(true)
    try {
      const result = await registerExpense({
        category: form.category,
        description: form.description,
        amount: parseFloat(form.amount),
        expenseDate: new Date(form.expenseDate),
      })
      if (result.success) {
        toast.success("Egreso registrado")
        router.refresh()
        onClose()
      } else {
        toast.error(result.error ?? "Error al registrar el egreso")
      }
    } catch {
      toast.error("Error inesperado al registrar el egreso")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Registrar egreso</h2>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-500">Categoría</label>
            <select
              className="w-full h-9 px-2.5 text-[13px] border border-gray-200 rounded-lg bg-white"
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as typeof f.category }))}
            >
              {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-500">Descripción</label>
            <input
              className="w-full h-9 px-2.5 text-[13px] border border-gray-200 rounded-lg"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500">Monto (USD)</label>
              <input
                type="number" min="0"
                className="w-full h-9 px-2.5 text-[13px] border border-gray-200 rounded-lg"
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500">Fecha</label>
              <input
                type="date"
                className="w-full h-9 px-2.5 text-[13px] border border-gray-200 rounded-lg"
                value={form.expenseDate}
                onChange={(e) => setForm((f) => ({ ...f, expenseDate: e.target.value }))}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 px-6 py-4 border-t border-gray-100 bg-gray-50">
          <button onClick={onClose} className="flex-1 h-9 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-100">
            Cancelar
          </button>
          <button onClick={handleSubmit} disabled={loading} className="flex-1 h-9 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50">
            {loading ? "Guardando…" : "Registrar egreso"}
          </button>
        </div>
      </div>
    </div>
  )
}
