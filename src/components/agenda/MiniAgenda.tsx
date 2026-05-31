"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Calendar, ChevronRight } from "lucide-react"
import { format, isToday, isTomorrow } from "date-fns"
import { es } from "date-fns/locale"
import { getUpcomingAppointments } from "@/lib/actions/agenda"

type Appt = {
  id: string
  scheduledAt: Date
  procedure: string
  status: string
  patient: { fullName: string }
}

const STATUS_DOT: Record<string, string> = {
  SCHEDULED: "bg-blue-400",
  CONFIRMED: "bg-green-400",
  COMPLETED: "bg-gray-300",
  CANCELLED: "bg-red-400",
  NO_SHOW: "bg-amber-400",
}

function groupLabel(date: Date): string {
  if (isToday(date)) return "Hoy"
  if (isTomorrow(date)) return "Mañana"
  return format(date, "EEEE d MMM", { locale: es })
}

export function MiniAgenda() {
  const [appointments, setAppointments] = useState<Appt[]>([])

  useEffect(() => {
    getUpcomingAppointments(6).then((res) => {
      if (res.success) setAppointments(res.data as Appt[])
    })
  }, [])

  const grouped = appointments.reduce<Record<string, Appt[]>>((acc, appt) => {
    const label = groupLabel(new Date(appt.scheduledAt))
    if (!acc[label]) acc[label] = []
    acc[label].push(appt)
    return acc
  }, {})

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-indigo-500" />
          <span className="text-sm font-semibold text-gray-800">Próximas citas</span>
        </div>
        <Link
          href="/agenda"
          className="flex items-center gap-0.5 text-xs text-indigo-600 hover:underline font-medium"
        >
          Ver todas <ChevronRight className="w-3 h-3" />
        </Link>
      </div>

      <div className="divide-y divide-gray-50">
        {Object.entries(grouped).length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-6">Sin citas próximas</p>
        ) : (
          Object.entries(grouped).map(([label, appts]) => (
            <div key={label} className="px-4 py-2">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">{label}</p>
              <div className="space-y-1.5">
                {appts.map((appt) => (
                  <Link
                    key={appt.id}
                    href={`/agenda?highlight=${appt.id}`}
                    className="flex items-center gap-2.5 group"
                  >
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_DOT[appt.status] ?? "bg-gray-300"}`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-gray-700 group-hover:text-indigo-600 truncate leading-tight">
                        {format(new Date(appt.scheduledAt), "h:mm a")} &nbsp;{appt.patient.fullName}
                      </p>
                      <p className="text-[11px] text-gray-400 truncate">{appt.procedure}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
