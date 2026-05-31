"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { X, User, Calendar, Stethoscope, DollarSign, FileText, CheckCircle, XCircle } from "lucide-react"
import { toast } from "sonner"
import type { CalendarEvent } from "@/lib/actions/agenda"
import {
  createAppointmentFromCalendar,
  updateAppointmentStatusFromCalendar,
} from "@/lib/actions/agenda"

type Patient = { id: string; fullName: string; phone: string }
type Dentist = { id: string; name: string }

interface Props {
  mode: "create" | "view"
  start?: string
  end?: string
  event?: CalendarEvent
  onClose: () => void
}

const STATUS_LABELS: Record<string, string> = {
  SCHEDULED: "Agendada",
  CONFIRMED: "Confirmada",
  COMPLETED: "Completada",
  CANCELLED: "Cancelada",
  NO_SHOW: "No asistió",
}

const STATUS_COLORS: Record<string, string> = {
  SCHEDULED: "bg-blue-100 text-blue-700",
  CONFIRMED: "bg-green-100 text-green-700",
  COMPLETED: "bg-gray-100 text-gray-600",
  CANCELLED: "bg-red-100 text-red-700",
  NO_SHOW: "bg-amber-100 text-amber-700",
}

const PROCEDURE_OPTIONS = [
  "Ortodoncia",
  "Implantes",
  "Blanqueamiento",
  "Endodoncia",
  "Limpieza",
  "Cirugía oral",
  "Prótesis",
  "Consulta general",
  "Control",
  "Otro",
]

export function AppointmentModal({ mode, start, end, event, onClose }: Props) {
  const [patients, setPatients] = useState<Patient[]>([])
  const [dentists, setDentists] = useState<Dentist[]>([])
  const [loading, setLoading] = useState(false)

  const [form, setForm] = useState({
    patientId: "",
    dentistId: "",
    procedure: "Consulta general",
    scheduledAt: start ?? new Date().toISOString(),
    value: "",
    notes: "",
  })

  useEffect(() => {
    if (mode !== "create") return
    fetch("/api/agenda/patients-dentists")
      .then((r) => r.json())
      .then((data) => {
        setPatients(data.patients ?? [])
        setDentists(data.dentists ?? [])
        if (data.dentists?.[0]) setForm((f) => ({ ...f, dentistId: data.dentists[0].id }))
      })
      .catch(() => {})
  }, [mode])

  const handleCreate = async () => {
    if (!form.patientId || !form.dentistId || !form.procedure) {
      toast.error("Completa los campos obligatorios")
      return
    }
    setLoading(true)
    const result = await createAppointmentFromCalendar({
      patientId: form.patientId,
      dentistId: form.dentistId,
      procedure: form.procedure,
      scheduledAt: form.scheduledAt,
      value: form.value ? parseFloat(form.value) : undefined,
      notes: form.notes || undefined,
    })
    setLoading(false)
    if (result.success) {
      toast.success("Cita agendada correctamente")
      onClose()
    } else {
      toast.error(result.error ?? "Error al crear la cita")
    }
  }

  const handleStatusChange = async (status: "CONFIRMED" | "COMPLETED" | "CANCELLED" | "NO_SHOW") => {
    if (!event) return
    setLoading(true)
    const result = await updateAppointmentStatusFromCalendar(event.id, status)
    setLoading(false)
    if (result.success) {
      toast.success("Estado actualizado")
      onClose()
    } else {
      toast.error("Error al actualizar")
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">
            {mode === "create" ? "Nueva cita" : "Detalle de cita"}
          </h2>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {mode === "create" ? (
            <>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-500">Paciente *</label>
                <select
                  className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={form.patientId}
                  onChange={(e) => setForm((f) => ({ ...f, patientId: e.target.value }))}
                >
                  <option value="">Seleccionar paciente…</option>
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>{p.fullName}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-500">Odontólogo *</label>
                <select
                  className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={form.dentistId}
                  onChange={(e) => setForm((f) => ({ ...f, dentistId: e.target.value }))}
                >
                  <option value="">Seleccionar odontólogo…</option>
                  {dentists.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-500">Tratamiento *</label>
                <select
                  className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={form.procedure}
                  onChange={(e) => setForm((f) => ({ ...f, procedure: e.target.value }))}
                >
                  {PROCEDURE_OPTIONS.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-500">Fecha y hora</label>
                  <input
                    type="datetime-local"
                    className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={form.scheduledAt.slice(0, 16)}
                    onChange={(e) => setForm((f) => ({ ...f, scheduledAt: new Date(e.target.value).toISOString() }))}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-500">Valor (USD)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={form.value}
                    onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-500">Notas</label>
                <textarea
                  rows={2}
                  placeholder="Observaciones opcionales…"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                />
              </div>
            </>
          ) : event ? (
            <>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                  <User className="w-5 h-5 text-indigo-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm">{event.extendedProps.patientName}</p>
                  <p className="text-xs text-gray-500">{event.extendedProps.patientPhone}</p>
                </div>
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[event.extendedProps.status] ?? "bg-gray-100 text-gray-600"}`}>
                  {STATUS_LABELS[event.extendedProps.status] ?? event.extendedProps.status}
                </span>
              </div>

              <div className="space-y-2.5 text-sm">
                <div className="flex items-center gap-2 text-gray-600">
                  <Stethoscope className="w-4 h-4 text-gray-400" />
                  <span>{event.extendedProps.procedure}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <User className="w-4 h-4 text-gray-400" />
                  <span>Dr. {event.extendedProps.dentistName}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span>
                    {format(new Date(event.start), "EEEE d 'de' MMMM, HH:mm", { locale: es })}
                  </span>
                </div>
                {event.extendedProps.value && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <DollarSign className="w-4 h-4 text-gray-400" />
                    <span>${event.extendedProps.value.toLocaleString()} USD</span>
                  </div>
                )}
                {event.extendedProps.notes && (
                  <div className="flex items-start gap-2 text-gray-600">
                    <FileText className="w-4 h-4 text-gray-400 mt-0.5" />
                    <span>{event.extendedProps.notes}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-gray-600">
                  <CheckCircle className="w-4 h-4 text-gray-400" />
                  <span>
                    Confirmado: {event.extendedProps.patientConfirmed ? "Sí" : "No"} &nbsp;·&nbsp; Recordatorio: {event.extendedProps.reminderStatus}
                  </span>
                </div>
              </div>
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-2 px-6 py-4 border-t border-gray-100 bg-gray-50">
          {mode === "create" ? (
            <>
              <button
                onClick={onClose}
                className="flex-1 h-9 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreate}
                disabled={loading}
                className="flex-1 h-9 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {loading ? "Agendando…" : "Agendar cita"}
              </button>
            </>
          ) : (
            <>
              {event?.extendedProps.status === "SCHEDULED" && (
                <button
                  onClick={() => handleStatusChange("CONFIRMED")}
                  disabled={loading}
                  className="flex items-center gap-1.5 px-3 h-9 text-xs font-semibold text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 disabled:opacity-50 transition-colors"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  Confirmar
                </button>
              )}
              {(event?.extendedProps.status === "SCHEDULED" || event?.extendedProps.status === "CONFIRMED") && (
                <>
                  <button
                    onClick={() => handleStatusChange("COMPLETED")}
                    disabled={loading}
                    className="flex items-center gap-1.5 px-3 h-9 text-xs font-semibold text-gray-700 bg-gray-100 border border-gray-200 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
                  >
                    Completada
                  </button>
                  <button
                    onClick={() => handleStatusChange("CANCELLED")}
                    disabled={loading}
                    className="flex items-center gap-1.5 px-3 h-9 text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 disabled:opacity-50 transition-colors"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    Cancelar
                  </button>
                </>
              )}
              <button onClick={onClose} className="ml-auto flex items-center justify-center w-9 h-9 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
