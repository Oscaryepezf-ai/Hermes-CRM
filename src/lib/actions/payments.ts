"use server"

import { z } from "zod"
import { requirePermission, unauthorizedResponse } from "@/lib/rbac/guards"
import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"

const RegisterPaymentSchema = z.object({
  patientId: z.string(),
  appointmentId: z.string().optional(),
  serviceId: z.string().optional(),
  doctorId: z.string(),
  amount: z.number().positive(),
  paymentMethod: z.enum(["EFECTIVO", "TARJETA", "TRANSFERENCIA", "OTRO"]),
  receiptType: z.enum(["RECIBO", "FACTURA"]).default("RECIBO"),
  discount1: z.number().optional(),
  discount2: z.number().optional(),
  commissionPct: z.number().min(0).max(100).optional(),
  comment: z.string().optional(),
})

export async function registerPayment(data: z.infer<typeof RegisterPaymentSchema>) {
  const guard = await requirePermission("pipeline", "edit")
  if (!guard.authorized) return unauthorizedResponse(guard.error)

  const parsed = RegisterPaymentSchema.safeParse(data)
  if (!parsed.success) return { success: false, error: "Datos inválidos" }

  // `patientId` may reference either an existing Patient, or a Lead that
  // hasn't been converted yet (the payment form lists both) — resolve/upsert
  // the same way createAppointmentFromCalendar does.
  let patientId = parsed.data.patientId
  let patient = await db.patient.findUnique({
    where: { id: parsed.data.patientId },
    select: { id: true },
  })

  if (!patient) {
    const lead = await db.lead.findUnique({
      where: { id: parsed.data.patientId },
      select: { id: true, fullName: true, phone: true, email: true, clinicId: true },
    })
    if (!lead || lead.clinicId !== guard.user.clinicId) {
      return { success: false, error: "Paciente no encontrado" }
    }

    patient = await db.patient.findFirst({
      where: { phone: lead.phone, clinicId: guard.user.clinicId },
      select: { id: true },
    })
    if (!patient) {
      patient = await db.patient.create({
        data: {
          fullName: lead.fullName,
          phone: lead.phone,
          email: lead.email,
          clinicId: guard.user.clinicId,
        },
        select: { id: true },
      })
    }

    await db.lead.update({ where: { id: lead.id }, data: { patientId: patient.id } })
    patientId = patient.id
  }

  const commissionValue = parsed.data.commissionPct
    ? parsed.data.amount * (parsed.data.commissionPct / 100)
    : null

  await db.payment.create({
    data: {
      clinicId: guard.user.clinicId,
      patientId,
      appointmentId: parsed.data.appointmentId,
      serviceId: parsed.data.serviceId,
      doctorId: parsed.data.doctorId,
      amount: parsed.data.amount,
      paymentMethod: parsed.data.paymentMethod,
      receiptType: parsed.data.receiptType,
      discount1: parsed.data.discount1,
      discount2: parsed.data.discount2,
      commissionPct: parsed.data.commissionPct,
      commissionValue,
      comment: parsed.data.comment,
    },
  })

  revalidatePath("/reportes/ingresos")
  revalidatePath("/reportes/servicios-vendidos")
  revalidatePath("/reportes/servicios-terminados")
  return { success: true }
}
