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

  const commissionValue = parsed.data.commissionPct
    ? parsed.data.amount * (parsed.data.commissionPct / 100)
    : null

  await db.payment.create({
    data: {
      clinicId: guard.user.clinicId,
      patientId: parsed.data.patientId,
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
