import { db } from "@/lib/db"
import type { PeriodRange } from "./period"

// Las citas no registran duración real — se asume 1 hora por cita completada,
// la misma convención que ya usa el calendario para calcular el fin de cada evento.
const HOURS_PER_APPOINTMENT = 1

export async function getAgendaProductivity(clinicId: string, period: PeriodRange) {
  const appointments = await db.appointment.findMany({
    where: { clinicId, scheduledAt: { gte: period.start, lte: period.end } },
    include: { dentist: { select: { id: true, name: true } } },
  })

  const byDoctor = new Map<string, { name: string; hoursWorked: number; scheduled: number; attended: number }>()
  for (const appt of appointments) {
    const current = byDoctor.get(appt.dentistId) ?? {
      name: appt.dentist.name, hoursWorked: 0, scheduled: 0, attended: 0,
    }
    current.scheduled += 1
    if (appt.status === "COMPLETED") {
      current.attended += 1
      current.hoursWorked += HOURS_PER_APPOINTMENT
    }
    byDoctor.set(appt.dentistId, current)
  }

  const consultReasons = groupCount(appointments, (a) => a.procedure)

  return {
    byDoctor: Array.from(byDoctor.values()),
    consultReasons,
  }
}

function groupCount<T>(items: T[], keyFn: (item: T) => string) {
  const map = new Map<string, number>()
  for (const item of items) {
    const key = keyFn(item)
    map.set(key, (map.get(key) ?? 0) + 1)
  }
  return Array.from(map.entries()).map(([label, count]) => ({ label, count }))
}
