"use client"

import { useState, useEffect, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Plus, Trash2, Loader2, X } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { createBudget, updateBudget } from "@/lib/actions/budgets"
import { getClinicServices } from "@/lib/actions/services"

type Service = { id: string; name: string; defaultPrice: number; category: string }

type ItemRow = {
  id:          string
  serviceId:   string | null
  description: string
  quantity:    number
  unitPrice:   number
  discount:    number
}

type ExistingBudget = {
  id:          string
  doctorId:    string | null
  validUntil:  Date | string | null
  notes:       string | null
  discountPct: number
  items: {
    serviceId:   string | null
    description: string
    quantity:    number
    unitPrice:   number
    discount:    number
  }[]
}

interface BudgetEditorProps {
  leadId:    string
  doctors:   { id: string; name: string }[]
  budget?:   ExistingBudget   // if provided → edit mode
  onClose:   () => void
}

function rowTotal(row: ItemRow) {
  return row.quantity * row.unitPrice * (1 - row.discount / 100)
}

export function BudgetEditor({ leadId, doctors, budget, onClose }: BudgetEditorProps) {
  const router   = useRouter()
  const [isPending, startTransition] = useTransition()
  const [services, setServices] = useState<Service[]>([])

  const [doctorId, setDoctorId]   = useState(budget?.doctorId ?? (doctors[0]?.id ?? ""))
  const [validUntil, setValidUntil] = useState(
    budget?.validUntil ? new Date(budget.validUntil).toISOString().split("T")[0] : ""
  )
  const [notes, setNotes]         = useState(budget?.notes ?? "")
  const [discountPct, setDiscountPct] = useState(budget?.discountPct ?? 0)
  const [items, setItems] = useState<ItemRow[]>(
    budget?.items.map(it => ({
      id:          crypto.randomUUID(),
      serviceId:   it.serviceId,
      description: it.description,
      quantity:    it.quantity,
      unitPrice:   it.unitPrice,
      discount:    it.discount,
    })) ?? [{ id: crypto.randomUUID(), serviceId: null, description: "", quantity: 1, unitPrice: 0, discount: 0 }]
  )

  useEffect(() => {
    getClinicServices().then(res => { if (res.success) setServices(res.data as Service[]) })
  }, [])

  const subtotal = items.reduce((acc, r) => acc + rowTotal(r), 0)
  const total    = subtotal * (1 - discountPct / 100)

  function addRow() {
    setItems(prev => [...prev, { id: crypto.randomUUID(), serviceId: null, description: "", quantity: 1, unitPrice: 0, discount: 0 }])
  }

  function removeRow(id: string) {
    setItems(prev => prev.filter(r => r.id !== id))
  }

  function updateRow(id: string, field: keyof ItemRow, value: unknown) {
    setItems(prev => prev.map(r => r.id !== id ? r : { ...r, [field]: value }))
  }

  function selectService(rowId: string, serviceId: string) {
    const svc = services.find(s => s.id === serviceId)
    if (!svc) { updateRow(rowId, "serviceId", null); return }
    setItems(prev => prev.map(r => r.id !== rowId ? r : {
      ...r, serviceId: svc.id, description: svc.name, unitPrice: svc.defaultPrice,
    }))
  }

  function save(sendAfter = false) {
    if (items.some(r => !r.description.trim())) {
      toast.error("Completa la descripción de todos los ítems")
      return
    }
    if (items.length === 0) {
      toast.error("Agrega al menos un servicio")
      return
    }
    startTransition(async () => {
      const data = {
        leadId, doctorId: doctorId || null,
        validUntil: validUntil || null, notes: notes || null,
        discountPct,
        items: items.map(({ serviceId, description, quantity, unitPrice, discount }) => ({
          serviceId, description, quantity, unitPrice, discount,
        })),
      }
      const result = budget
        ? await updateBudget(budget.id, data)
        : await createBudget(data)

      if (!result.success) { toast.error(result.error); return }
      toast.success(budget ? "Presupuesto actualizado" : "Presupuesto creado")
      router.refresh()
      onClose()
    })
  }

  const fmtCurrency = (v: number) =>
    v.toLocaleString("es-EC", { style: "currency", currency: "USD", minimumFractionDigits: 2 })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-surface rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-line-subtle">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-line-subtle flex-shrink-0">
          <h2 className="text-[15px] font-bold text-ink-primary">
            {budget ? "Editar presupuesto" : "Nuevo presupuesto"}
          </h2>
          <button type="button" onClick={onClose} className="text-ink-tertiary hover:text-ink-primary">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Row 1: Doctor + Validity */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-medium text-ink-secondary block mb-1">Doctor</label>
              <select
                value={doctorId}
                onChange={e => setDoctorId(e.target.value)}
                className="w-full h-9 rounded-lg border border-line-subtle bg-transparent px-2.5 text-[13px] text-ink-primary outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
              >
                <option value="">Sin asignar</option>
                {doctors.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-medium text-ink-secondary block mb-1">Válido hasta (opcional)</label>
              <input
                type="date"
                value={validUntil}
                onChange={e => setValidUntil(e.target.value)}
                className="w-full h-9 rounded-lg border border-line-subtle bg-transparent px-2.5 text-[13px] text-ink-primary outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
              />
            </div>
          </div>

          {/* Items table */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[11px] font-medium text-ink-secondary">Servicios / Tratamientos</label>
              <button type="button" onClick={addRow} className="flex items-center gap-1 text-[11px] text-brand-600 font-medium hover:text-brand-700">
                <Plus className="w-3.5 h-3.5" /> Agregar ítem
              </button>
            </div>

            <div className="border border-line-subtle rounded-xl overflow-hidden">
              {/* Column headers */}
              <div className="grid grid-cols-[2fr_1fr_120px_80px_100px_36px] gap-0 bg-inset px-3 py-2 text-[10px] font-semibold text-ink-tertiary uppercase tracking-wide">
                <span>Descripción</span>
                <span>Servicio del catálogo</span>
                <span className="text-right">P. Unitario</span>
                <span className="text-right">Dto. %</span>
                <span className="text-right">Total</span>
                <span></span>
              </div>

              {items.map((row, idx) => (
                <div key={row.id} className={cn("grid grid-cols-[2fr_1fr_120px_80px_100px_36px] gap-0 px-3 py-2 border-t border-line-subtle items-center", idx % 2 === 1 && "bg-inset/40")}>
                  <input
                    value={row.description}
                    onChange={e => updateRow(row.id, "description", e.target.value)}
                    placeholder="Descripción del servicio"
                    className="h-8 rounded-lg border border-line-subtle bg-transparent px-2 text-[12px] text-ink-primary outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 mr-2"
                  />
                  <select
                    value={row.serviceId ?? ""}
                    onChange={e => selectService(row.id, e.target.value)}
                    className="h-8 rounded-lg border border-line-subtle bg-transparent px-2 text-[11px] text-ink-primary outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 mr-2"
                  >
                    <option value="">— seleccionar —</option>
                    {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  <div className="flex items-center gap-1 mr-2">
                    <input
                      type="number" min={1} value={row.quantity}
                      onChange={e => updateRow(row.id, "quantity", parseInt(e.target.value) || 1)}
                      className="w-12 h-8 rounded-lg border border-line-subtle bg-transparent px-2 text-[12px] text-center outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
                    />
                    <span className="text-[10px] text-ink-disabled">×</span>
                    <input
                      type="number" min={0} step={0.01} value={row.unitPrice}
                      onChange={e => updateRow(row.id, "unitPrice", parseFloat(e.target.value) || 0)}
                      className="w-[60px] h-8 rounded-lg border border-line-subtle bg-transparent px-2 text-[12px] text-right outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
                    />
                  </div>
                  <input
                    type="number" min={0} max={100} step={1} value={row.discount}
                    onChange={e => updateRow(row.id, "discount", parseFloat(e.target.value) || 0)}
                    className="h-8 rounded-lg border border-line-subtle bg-transparent px-2 text-[12px] text-right outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 mr-2"
                  />
                  <p className="text-[12px] font-semibold text-ink-primary text-right mr-2">
                    {fmtCurrency(rowTotal(row))}
                  </p>
                  <button
                    type="button"
                    onClick={() => removeRow(row.id)}
                    disabled={items.length === 1}
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-ink-tertiary hover:bg-red-50 hover:text-red-500 disabled:opacity-30"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Totals + notes */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="text-[11px] font-medium text-ink-secondary block mb-1">Notas (aparecen en el PDF)</label>
              <Textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={4}
                maxLength={1000}
                placeholder="Condiciones de pago, incluye materiales, etc."
                className="text-[13px]"
              />
            </div>
            <div className="space-y-2 pt-5">
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-ink-secondary">Subtotal</span>
                <span className="text-[12px] font-medium text-ink-primary">{fmtCurrency(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between">
                <label className="text-[12px] text-ink-secondary">Descuento global (%)</label>
                <input
                  type="number" min={0} max={100} step={1} value={discountPct}
                  onChange={e => setDiscountPct(parseFloat(e.target.value) || 0)}
                  className="w-20 h-7 rounded-lg border border-line-subtle bg-transparent px-2 text-[12px] text-right outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
                />
              </div>
              {discountPct > 0 && (
                <div className="flex items-center justify-between text-red-600">
                  <span className="text-[12px]">Descuento ({discountPct}%)</span>
                  <span className="text-[12px] font-medium">- {fmtCurrency(subtotal * discountPct / 100)}</span>
                </div>
              )}
              <div className="flex items-center justify-between pt-2 border-t border-line-subtle">
                <span className="text-[14px] font-bold text-ink-primary">TOTAL</span>
                <span className="text-[18px] font-bold text-brand-600">{fmtCurrency(total)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-line-subtle flex-shrink-0">
          <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>Cancelar</Button>
          <Button type="button" variant="outline" onClick={() => save(false)} disabled={isPending}>
            {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
            Guardar borrador
          </Button>
        </div>
      </div>
    </div>
  )
}
