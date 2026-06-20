"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { X } from "lucide-react"
import { toast } from "sonner"
import { registerPayment } from "@/lib/actions/payments"
import { getClinicServices, getClinicDoctors } from "@/lib/actions/services"

type Patient = { id: string; fullName: string; kind?: "patient" | "lead" }
type Doctor = { id: string; name: string }
type Service = { id: string; name: string; defaultPrice: number }

export function PaymentFormModal({ onClose }: { onClose: () => void }) {
  const router = useRouter()
  const [patients, setPatients] = useState<Patient[]>([])
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(false)

  const [form, setForm] = useState({
    patientId: "",
    doctorId: "",
    serviceId: "",
    amount: "",
    paymentMethod: "EFECTIVO" as "EFECTIVO" | "TARJETA" | "TRANSFERENCIA" | "OTRO",
    receiptType: "RECIBO" as "RECIBO" | "FACTURA",
    discount1: "",
    discount2: "",
    commissionPct: "",
    comment: "",
  })

  useEffect(() => {
    fetch("/api/agenda/patients-dentists")
      .then((r) => r.json())
      .then((data) => setPatients(data.patients ?? []))
      .catch(() => {})
    getClinicDoctors().then((res) => {
      if (res.success && res.data) setDoctors(res.data)
    })
    getClinicServices().then((res) => {
      if (res.success && res.data) setServices(res.data)
    })
  }, [])

  const handleServiceChange = (serviceId: string) => {
    const service = services.find((s) => s.id === serviceId)
    setForm((f) => ({ ...f, serviceId, amount: service ? String(service.defaultPrice) : f.amount }))
  }

  const handleSubmit = async () => {
    if (!form.patientId || !form.doctorId || !form.amount) {
      toast.error("Completa los campos obligatorios")
      return
    }
    setLoading(true)
    try {
      const result = await registerPayment({
        patientId: form.patientId,
        doctorId: form.doctorId,
        serviceId: form.serviceId || undefined,
        amount: parseFloat(form.amount),
        paymentMethod: form.paymentMethod,
        receiptType: form.receiptType,
        discount1: form.discount1 ? parseFloat(form.discount1) : undefined,
        discount2: form.discount2 ? parseFloat(form.discount2) : undefined,
        commissionPct: form.commissionPct ? parseFloat(form.commissionPct) : undefined,
        comment: form.comment || undefined,
      })
      if (result.success) {
        toast.success("Pago registrado")
        router.refresh()
        onClose()
      } else {
        toast.error(result.error ?? "Error al registrar el pago")
      }
    } catch {
      toast.error("Error inesperado al registrar el pago")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Registrar pago</h2>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-3">
          <Field label="Paciente *">
            <select className="input" value={form.patientId} onChange={(e) => setForm((f) => ({ ...f, patientId: e.target.value }))}>
              <option value="">Seleccionar paciente…</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>{p.fullName}</option>
              ))}
            </select>
          </Field>

          <Field label="Doctor *">
            <select className="input" value={form.doctorId} onChange={(e) => setForm((f) => ({ ...f, doctorId: e.target.value }))}>
              <option value="">Seleccionar doctor…</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </Field>

          <Field label="Servicio">
            <select className="input" value={form.serviceId} onChange={(e) => handleServiceChange(e.target.value)}>
              <option value="">Sin servicio específico</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Monto (USD) *">
              <input type="number" min="0" className="input" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} />
            </Field>
            <Field label="Medio de pago">
              <select className="input" value={form.paymentMethod} onChange={(e) => setForm((f) => ({ ...f, paymentMethod: e.target.value as typeof f.paymentMethod }))}>
                <option value="EFECTIVO">Efectivo</option>
                <option value="TARJETA">Tarjeta</option>
                <option value="TRANSFERENCIA">Transferencia</option>
                <option value="OTRO">Otro</option>
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Comprobante">
              <select className="input" value={form.receiptType} onChange={(e) => setForm((f) => ({ ...f, receiptType: e.target.value as typeof f.receiptType }))}>
                <option value="RECIBO">Recibo</option>
                <option value="FACTURA">Factura</option>
              </select>
            </Field>
            <Field label="Comisión doctor (%)">
              <input type="number" min="0" max="100" className="input" value={form.commissionPct} onChange={(e) => setForm((f) => ({ ...f, commissionPct: e.target.value }))} />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Descuento 1 (USD)">
              <input type="number" min="0" className="input" value={form.discount1} onChange={(e) => setForm((f) => ({ ...f, discount1: e.target.value }))} />
            </Field>
            <Field label="Descuento 2 (USD)">
              <input type="number" min="0" className="input" value={form.discount2} onChange={(e) => setForm((f) => ({ ...f, discount2: e.target.value }))} />
            </Field>
          </div>

          <Field label="Comentario">
            <textarea rows={2} className="input resize-none" value={form.comment} onChange={(e) => setForm((f) => ({ ...f, comment: e.target.value }))} />
          </Field>
        </div>

        <div className="flex items-center gap-2 px-6 py-4 border-t border-gray-100 bg-gray-50">
          <button onClick={onClose} className="flex-1 h-9 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-100">
            Cancelar
          </button>
          <button onClick={handleSubmit} disabled={loading} className="flex-1 h-9 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50">
            {loading ? "Guardando…" : "Registrar pago"}
          </button>
        </div>
      </div>

      <style jsx global>{`
        .input {
          width: 100%; height: 36px; padding: 0 10px; font-size: 13px;
          border: 1px solid #e5e7eb; border-radius: 8px; background: white;
        }
        textarea.input { height: auto; padding: 8px 10px; }
      `}</style>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-gray-500">{label}</label>
      {children}
    </div>
  )
}
