"use client"

import { useState, useEffect } from "react"
import { CalendarCheck, X } from "lucide-react"
import { toast } from "sonner"
import { scheduleLeadAppointment } from "@/lib/actions/agenda"

const PROCEDURE_OPTIONS = [
  "Consulta de valoración",
  "Ortodoncia",
  "Implantes",
  "Blanqueamiento",
  "Endodoncia",
  "Limpieza",
  "Cirugía oral",
  "Prótesis",
  "Control",
  "Otro",
]

type Dentist = { id: string; name: string }

interface Props {
  leadId:   string
  leadName: string
  onClose:  () => void
  onSuccess: () => void
}

export function ScheduleLeadAppointmentModal({ leadId, leadName, onClose, onSuccess }: Props) {
  const [dentists, setDentists] = useState<Dentist[]>([])
  const [loading,  setLoading]  = useState(false)

  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(9, 0, 0, 0)
  const defaultDate = tomorrow.toISOString().slice(0, 16)

  const [form, setForm] = useState({
    dentistId:   "",
    procedure:   "Consulta de valoración",
    scheduledAt: defaultDate,
    value:       "",
    notes:       "",
  })

  useEffect(() => {
    fetch("/api/agenda/patients-dentists")
      .then(r => r.json())
      .then(data => {
        const list: Dentist[] = data.dentists ?? []
        setDentists(list)
        if (list[0]) setForm(f => ({ ...f, dentistId: list[0].id }))
      })
      .catch(() => {})
  }, [])

  const handleSubmit = async () => {
    if (!form.dentistId) { toast.error("Selecciona un odontólogo"); return }
    if (!form.scheduledAt) { toast.error("Elige una fecha y hora"); return }

    setLoading(true)
    const res = await scheduleLeadAppointment({
      leadId,
      dentistId:   form.dentistId,
      procedure:   form.procedure,
      scheduledAt: new Date(form.scheduledAt).toISOString(),
      value:       form.value ? parseFloat(form.value) : undefined,
      notes:       form.notes || undefined,
    })
    setLoading(false)

    if (res.success) {
      toast.success("Cita agendada — lead avanzó a Cita agendada")
      onSuccess()
      onClose()
    } else {
      toast.error(res.error ?? "Error al agendar")
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-surface rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-line-soft">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-line-subtle">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
              <CalendarCheck className="w-4 h-4 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-ink-primary">Agendar cita</h2>
              <p className="text-xs text-ink-tertiary">{leadName}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-inset rounded-md transition-colors">
            <X className="w-4 h-4 text-ink-tertiary" />
          </button>
        </div>

        {/* Form */}
        <div className="px-5 py-4 space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-ink-secondary">Tratamiento *</label>
            <select
              className="w-full h-9 px-3 text-sm border border-line-soft rounded-lg bg-canvas text-ink-primary focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={form.procedure}
              onChange={e => setForm(f => ({ ...f, procedure: e.target.value }))}
            >
              {PROCEDURE_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-ink-secondary">Odontólogo *</label>
            <select
              className="w-full h-9 px-3 text-sm border border-line-soft rounded-lg bg-canvas text-ink-primary focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={form.dentistId}
              onChange={e => setForm(f => ({ ...f, dentistId: e.target.value }))}
            >
              <option value="">Seleccionar…</option>
              {dentists.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-xs font-medium text-ink-secondary">Fecha y hora *</label>
              <input
                type="datetime-local"
                className="w-full h-9 px-3 text-sm border border-line-soft rounded-lg bg-canvas text-ink-primary focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={form.scheduledAt}
                onChange={e => setForm(f => ({ ...f, scheduledAt: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-ink-secondary">Valor (USD)</label>
              <input
                type="number"
                min="0"
                placeholder="0"
                className="w-full h-9 px-3 text-sm border border-line-soft rounded-lg bg-canvas text-ink-primary focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={form.value}
                onChange={e => setForm(f => ({ ...f, value: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-ink-secondary">Notas</label>
            <textarea
              rows={2}
              placeholder="Observaciones opcionales…"
              className="w-full px-3 py-2 text-sm border border-line-soft rounded-lg bg-canvas text-ink-primary resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2 px-5 py-4 border-t border-line-subtle bg-canvas">
          <button
            onClick={onClose}
            className="flex-1 h-9 text-sm font-medium text-ink-secondary border border-line-soft rounded-lg hover:bg-inset transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !form.dentistId}
            className="flex-1 h-9 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {loading ? "Agendando…" : "Confirmar cita"}
          </button>
        </div>
      </div>
    </div>
  )
}
