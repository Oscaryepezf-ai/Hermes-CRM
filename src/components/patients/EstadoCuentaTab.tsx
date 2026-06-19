import { DollarSign, Calendar, Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react"
import { formatDate, formatCurrency } from "@/lib/utils"
import { ComingSoonTab } from "./ComingSoonTab"
import type { Patient, Appointment, User as DentistUser } from "@prisma/client"

type PatientWithAppointments = Patient & {
  appointments: (Appointment & { dentist: Pick<DentistUser, "id" | "name"> })[]
}

const statusConfig: Record<string, { label: string; icon: typeof CheckCircle; color: string }> = {
  COMPLETED: { label: "Completada", icon: CheckCircle, color: "text-emerald-600" },
  CANCELLED: { label: "Cancelada", icon: XCircle, color: "text-red-500" },
  SCHEDULED: { label: "Agendada", icon: Clock, color: "text-blue-500" },
  CONFIRMED: { label: "Confirmada", icon: CheckCircle, color: "text-indigo-600" },
  NO_SHOW: { label: "No asistió", icon: AlertCircle, color: "text-orange-500" },
}

export function EstadoCuentaTab({ patient }: { patient: PatientWithAppointments | null }) {
  if (!patient) {
    return (
      <ComingSoonTab
        title="Aún no es paciente activo"
        description="Este contacto todavía no tiene citas registradas. Conviértelo en paciente o agenda su primera cita desde el pipeline para ver su estado de cuenta."
      />
    )
  }

  const totalRevenue = patient.appointments
    .filter((a) => a.status === "COMPLETED")
    .reduce((sum, a) => sum + (a.value ?? 0), 0)

  const nextAppt = patient.appointments.find(
    (a) => a.status === "SCHEDULED" || a.status === "CONFIRMED"
  )

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-surface border border-line-subtle rounded-[12px] p-4 shadow-card">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="w-4 h-4 text-emerald-600" />
            <span className="text-[11px] text-ink-tertiary font-medium">Total invertido</span>
          </div>
          <p className="text-[16px] font-bold text-ink-primary">{formatCurrency(totalRevenue, "USD")}</p>
        </div>

        <div className="bg-surface border border-line-subtle rounded-[12px] p-4 shadow-card">
          <div className="flex items-center gap-2 mb-1">
            <Calendar className="w-4 h-4 text-brand-500" />
            <span className="text-[11px] text-ink-tertiary font-medium">Total citas</span>
          </div>
          <p className="text-[16px] font-bold text-ink-primary">{patient.appointments.length}</p>
        </div>

        <div className="bg-surface border border-line-subtle rounded-[12px] p-4 shadow-card">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-cyan-600" />
            <span className="text-[11px] text-ink-tertiary font-medium">Próxima cita</span>
          </div>
          <p className="text-[13px] font-semibold text-ink-primary">
            {nextAppt ? formatDate(nextAppt.scheduledAt) : "Sin agendar"}
          </p>
        </div>
      </div>

      <div className="bg-surface border border-line-subtle rounded-[12px] p-5 shadow-card">
        <h3 className="text-[14px] font-bold text-ink-primary mb-3">Historial de citas</h3>
        <div className="space-y-4">
          {patient.appointments.length === 0 ? (
            <p className="text-[13px] text-ink-tertiary text-center py-4">Sin citas registradas</p>
          ) : (
            patient.appointments.map((appt, idx) => {
              const status = statusConfig[appt.status] ?? statusConfig.SCHEDULED
              const Icon = status.icon
              return (
                <div key={appt.id}>
                  {idx > 0 && <div className="border-t border-line-subtle mb-4" />}
                  <div className="flex items-start gap-3">
                    <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${status.color}`} />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="text-[13px] font-semibold text-ink-primary">{appt.procedure}</p>
                        {appt.value && (
                          <p className="text-[13px] font-semibold text-ink-secondary">
                            {formatCurrency(appt.value, "USD")}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className={`text-[11px] font-medium ${status.color}`}>{status.label}</span>
                        <span className="text-[11px] text-ink-tertiary">
                          {formatDate(appt.scheduledAt)} · Dr. {appt.dentist.name}
                        </span>
                      </div>
                      {appt.notes && (
                        <p className="text-[11px] text-ink-tertiary mt-1 bg-inset rounded px-2 py-1">{appt.notes}</p>
                      )}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
