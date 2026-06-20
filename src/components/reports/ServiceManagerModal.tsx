"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { X } from "lucide-react"
import { toast } from "sonner"
import { createService } from "@/lib/actions/services"
import type { DentalTreatment } from "@prisma/client"

const CATEGORY_LABELS: Record<string, string> = {
  ORTODONCIA: "Ortodoncia",
  IMPLANTES: "Implantes",
  BLANQUEAMIENTO: "Blanqueamiento",
  ENDODONCIA: "Endodoncia",
  LIMPIEZA: "Limpieza",
  CIRUGIA: "Cirugía",
  PROTESIS: "Prótesis",
  OTRO: "Otro",
}

type Service = { id: string; name: string; category: DentalTreatment; defaultPrice: number }

export function ServiceManagerModal({ services, onClose }: { services: Service[]; onClose: () => void }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ name: "", category: "OTRO" as DentalTreatment, defaultPrice: "" })

  const handleAdd = async () => {
    if (!form.name || !form.defaultPrice) {
      toast.error("Completa nombre y precio")
      return
    }
    setLoading(true)
    const result = await createService({
      name: form.name,
      category: form.category,
      defaultPrice: parseFloat(form.defaultPrice),
    })
    setLoading(false)
    if (result.success) {
      toast.success("Servicio agregado")
      setForm({ name: "", category: "OTRO", defaultPrice: "" })
      router.refresh()
    } else {
      toast.error(result.error ?? "Error al agregar el servicio")
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Gestionar servicios</h2>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
          {services.length === 0 && <p className="text-[12px] text-gray-400 text-center py-4">Sin servicios todavía</p>}
          {services.map((s) => (
            <div key={s.id} className="flex items-center justify-between px-3 py-2 rounded-lg border border-gray-100">
              <div>
                <p className="text-[13px] font-medium text-gray-900">{s.name}</p>
                <p className="text-[11px] text-gray-400">{CATEGORY_LABELS[s.category]}</p>
              </div>
              <p className="text-[13px] font-semibold text-gray-700">${s.defaultPrice.toLocaleString()}</p>
            </div>
          ))}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 space-y-2">
          <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">Agregar servicio</p>
          <input
            placeholder="Nombre"
            className="w-full h-9 px-2.5 text-[13px] border border-gray-200 rounded-lg"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
          <div className="grid grid-cols-2 gap-2">
            <select
              className="h-9 px-2 text-[13px] border border-gray-200 rounded-lg bg-white"
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as DentalTreatment }))}
            >
              {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            <input
              type="number" min="0" placeholder="Precio USD"
              className="h-9 px-2.5 text-[13px] border border-gray-200 rounded-lg"
              value={form.defaultPrice}
              onChange={(e) => setForm((f) => ({ ...f, defaultPrice: e.target.value }))}
            />
          </div>
          <button onClick={handleAdd} disabled={loading} className="w-full h-9 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50">
            {loading ? "Agregando…" : "+ Agregar servicio"}
          </button>
        </div>
      </div>
    </div>
  )
}
