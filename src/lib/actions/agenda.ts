"use server"

import { z } from "zod"
import { auth } from "../../../auth"
import { db } from "@/lib/db"
import { requirePermission } from "@/lib/rbac/guards"
import { revalidatePath } from "next/cache"
import { sendPushToClinicAdmins } from "@/lib/push/send-notification"
import {
  appointmentCreatedNotification,
  appointmentCancelledNotification,
} from "@/lib/push/notification-templates"

export type CalendarEvent = {
  id: string
  title: string
  start: string
  end: string
  backgroundColor: string
  borderColor: string
  textColor: string
  extendedProps: {
    patientId: string
    patientName: string
    patientPhone: string
    procedure: string
    dentistName: string
    status: string
    value?: number
    notes?: string
    reminderStatus: string
    patientConfirmed: boolean
  }
}

const STATUS_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  SCHEDULED: { bg: '#EFF6FF', border: '#4A90E2', text: '#1D4ED8' },
  CONFIRMED: { bg: '#D1FAE5', border: '#10B981', text: '#065F46' },
  COMPLETED: { bg: '#F3F4F6', border: '#9CA3AF', text: '#4B5563' },
  CANCELLED: { bg: '#FEE2E2', border: '#EF4444', text: '#991B1B' },
  NO_SHOW: { bg: '#FEF3C7', border: '#F59E0B', text: '#92400E' },
}

export async function getCalendarEvents(params: {
  start: string
  end: string
}): Promise<{ success: boolean; data?: CalendarEvent[]; error?: string }> {
  const session = await auth()
  if (!session?.user?.clinicId) return { success: false, error: 'No autorizado' }

  const appointments = await db.appointment.findMany({
    where: {
      clinicId: session.user.clinicId,
      scheduledAt: {
        gte: new Date(params.start),
        lte: new Date(params.end),
      },
    },
    include: {
      patient: { select: { id: true, fullName: true, phone: true } },
      dentist: { select: { name: true } },
    },
    orderBy: { scheduledAt: 'asc' },
  })

  const events: CalendarEvent[] = appointments.map((appt) => {
    const colors = STATUS_COLORS[appt.status] ?? STATUS_COLORS.SCHEDULED
    const endTime = new Date(appt.scheduledAt.getTime() + 60 * 60 * 1000)

    return {
      id: appt.id,
      title: `${appt.patient.fullName} — ${appt.procedure}`,
      start: appt.scheduledAt.toISOString(),
      end: endTime.toISOString(),
      backgroundColor: colors.bg,
      borderColor: colors.border,
      textColor: colors.text,
      extendedProps: {
        patientId: appt.patient.id,
        patientName: appt.patient.fullName,
        patientPhone: appt.patient.phone,
        procedure: appt.procedure,
        dentistName: appt.dentist.name,
        status: appt.status,
        value: appt.value ?? undefined,
        notes: appt.notes ?? undefined,
        reminderStatus: appt.reminderStatus,
        patientConfirmed: appt.patientConfirmed,
      },
    }
  })

  return { success: true, data: events }
}

const CreateSchema = z.object({
  patientId: z.string(),
  dentistId: z.string(),
  procedure: z.string().min(1),
  scheduledAt: z.string().datetime(),
  value: z.number().optional(),
  notes: z.string().optional(),
})

export async function createAppointmentFromCalendar(
  data: z.infer<typeof CreateSchema>
) {
  const guard = await requirePermission("agenda", "create")
  if (!guard.authorized) return { success: false, error: guard.error }
  const session = await auth()
  if (!session?.user?.clinicId) return { success: false, error: 'No autorizado' }

  const parsed = CreateSchema.safeParse(data)
  if (!parsed.success) return { success: false, error: 'Datos inválidos' }

  const patient = await db.patient.findUniqueOrThrow({
    where: { id: data.patientId },
    select: { fullName: true },
  })

  const appointment = await db.appointment.create({
    data: {
      patientId: data.patientId,
      clinicId: session.user.clinicId,
      dentistId: data.dentistId,
      procedure: data.procedure,
      scheduledAt: new Date(data.scheduledAt),
      value: data.value,
      notes: data.notes,
      status: 'SCHEDULED',
    },
  })

  sendPushToClinicAdmins(
    session.user.clinicId,
    appointmentCreatedNotification({
      patientName: patient.fullName,
      procedure: data.procedure,
      scheduledAt: new Date(data.scheduledAt),
      appointmentId: appointment.id,
    })
  ).catch(console.error)

  revalidatePath('/agenda')
  return { success: true, data: appointment }
}

export async function updateAppointmentStatusFromCalendar(
  appointmentId: string,
  status: 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW'
) {
  const guard = await requirePermission("agenda", "edit")
  if (!guard.authorized) return { success: false, error: guard.error }
  const session = await auth()
  if (!session?.user?.clinicId) return { success: false, error: 'No autorizado' }

  const appt = await db.appointment.findUniqueOrThrow({ where: { id: appointmentId } })
  if (appt.clinicId !== session.user.clinicId) return { success: false, error: 'No autorizado' }

  await db.appointment.update({
    where: { id: appointmentId },
    data: { status },
  })

  if (status === 'CANCELLED') {
    const patient = await db.patient.findUniqueOrThrow({
      where: { id: appt.patientId },
      select: { fullName: true },
    })
    sendPushToClinicAdmins(
      session.user.clinicId,
      appointmentCancelledNotification({
        patientName: patient.fullName,
        procedure: appt.procedure,
        appointmentId: appt.id,
      })
    ).catch(console.error)
  }

  revalidatePath('/agenda')
  return { success: true }
}

export async function getUpcomingAppointments(limit = 5) {
  const session = await auth()
  if (!session?.user?.clinicId) return { success: false, data: [] as UpcomingAppt[] }

  const appointments = await db.appointment.findMany({
    where: {
      clinicId: session.user.clinicId,
      status: { in: ['SCHEDULED', 'CONFIRMED'] },
      scheduledAt: { gte: new Date() },
    },
    include: {
      patient: { select: { fullName: true, phone: true } },
      dentist: { select: { name: true } },
    },
    orderBy: { scheduledAt: 'asc' },
    take: limit,
  })

  return { success: true, data: appointments }
}

type UpcomingAppt = Awaited<ReturnType<typeof db.appointment.findMany<{
  include: {
    patient: { select: { fullName: true; phone: true } }
    dentist: { select: { name: true } }
  }
}>>>[number]
