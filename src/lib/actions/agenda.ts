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
import { completeMission } from "@/lib/onboarding/activation-checklist"

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

  // `data.patientId` may reference either an existing Patient, or a Lead
  // that hasn't been converted to a Patient yet (e.g. selected from the
  // global "Agendar cita" quick-create button). Resolve/upsert accordingly.
  let patientId = data.patientId
  let patient = await db.patient.findUnique({
    where: { id: data.patientId },
    select: { id: true, fullName: true },
  })

  if (!patient) {
    const lead = await db.lead.findUnique({
      where: { id: data.patientId },
      select: { id: true, fullName: true, phone: true, email: true, clinicId: true },
    })
    if (!lead || lead.clinicId !== session.user.clinicId) {
      return { success: false, error: 'Paciente no encontrado' }
    }

    patient = await db.patient.findFirst({
      where: { phone: lead.phone, clinicId: session.user.clinicId },
      select: { id: true, fullName: true },
    })
    if (!patient) {
      patient = await db.patient.create({
        data: {
          fullName: lead.fullName,
          phone: lead.phone,
          email: lead.email,
          clinicId: session.user.clinicId,
        },
        select: { id: true, fullName: true },
      })
    }

    await db.lead.update({ where: { id: lead.id }, data: { patientId: patient.id } })
    patientId = patient.id
  }

  const appointment = await db.appointment.create({
    data: {
      patientId,
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
  const missionJustCompleted = await completeMission(session.user.clinicId, 'CREAR_CITA')
  return { success: true, data: appointment, missionJustCompleted }
}

const ScheduleLeadSchema = z.object({
  leadId:      z.string(),
  dentistId:   z.string(),
  procedure:   z.string().min(1),
  scheduledAt: z.string().datetime(),
  value:       z.number().optional(),
  notes:       z.string().optional(),
})

export async function scheduleLeadAppointment(
  data: z.infer<typeof ScheduleLeadSchema>
) {
  const guard = await requirePermission("agenda", "create")
  if (!guard.authorized) return { success: false, error: guard.error }
  const session = await auth()
  if (!session?.user?.clinicId) return { success: false, error: 'No autorizado' }

  const parsed = ScheduleLeadSchema.safeParse(data)
  if (!parsed.success) return { success: false, error: 'Datos inválidos' }

  const lead = await db.lead.findUnique({
    where:  { id: data.leadId },
    select: { fullName: true, phone: true, email: true, clinicId: true, journeyState: true },
  })

  if (!lead) return { success: false, error: 'Lead no encontrado' }
  if (lead.clinicId !== session.user.clinicId) return { success: false, error: 'No autorizado' }
  if (lead.journeyState !== 'CALIFICADO') {
    return { success: false, error: 'El lead debe estar en estado Calificado' }
  }

  // Upsert patient from lead data
  let patient = await db.patient.findFirst({
    where: { phone: lead.phone, clinicId: session.user.clinicId },
  })
  if (!patient) {
    patient = await db.patient.create({
      data: {
        fullName: lead.fullName,
        phone:    lead.phone,
        email:    lead.email,
        clinicId: session.user.clinicId,
      },
    })
  }

  const scheduledAt = new Date(data.scheduledAt)

  const [appointment] = await db.$transaction([
    db.appointment.create({
      data: {
        patientId:   patient.id,
        clinicId:    session.user.clinicId,
        dentistId:   data.dentistId,
        procedure:   data.procedure,
        scheduledAt,
        value:       data.value,
        notes:       data.notes,
        status:      'SCHEDULED',
      },
    }),
    db.lead.update({
      where: { id: data.leadId },
      data: {
        journeyState:     'CITA_AGENDADA',
        lastActivityAt:   new Date(),
        totalTouchpoints: { increment: 1 },
        patientId:        patient.id,
      },
    }),
    db.journeyEvent.create({
      data: {
        leadId:    data.leadId,
        userId:    session.user.id,
        type:      'APPOINTMENT_CREATED',
        fromState: 'CALIFICADO',
        toState:   'CITA_AGENDADA',
        metadata:  { procedure: data.procedure, scheduledAt: scheduledAt.toISOString(), value: data.value },
      },
    }),
  ])

  sendPushToClinicAdmins(
    session.user.clinicId,
    appointmentCreatedNotification({
      patientName: lead.fullName,
      procedure:   data.procedure,
      scheduledAt,
      appointmentId: appointment.id,
    })
  ).catch(console.error)

  revalidatePath('/agenda')
  revalidatePath('/pipeline')
  completeMission(session.user.clinicId, 'CREAR_CITA').catch(() => {})
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
