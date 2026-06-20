"use server"

import { z } from "zod"
import { requirePermission, unauthorizedResponse } from "@/lib/rbac/guards"
import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"

const RegisterExpenseSchema = z.object({
  category: z.enum(["INSUMOS", "ARRIENDO", "NOMINA", "SERVICIOS_BASICOS", "MARKETING", "EQUIPAMIENTO", "OTRO"]),
  description: z.string().min(2).max(200),
  amount: z.number().positive(),
  expenseDate: z.coerce.date(),
})

export async function registerExpense(data: z.infer<typeof RegisterExpenseSchema>) {
  const guard = await requirePermission("settings", "configure")
  if (!guard.authorized) return unauthorizedResponse(guard.error)

  const parsed = RegisterExpenseSchema.safeParse(data)
  if (!parsed.success) return { success: false, error: "Datos inválidos" }

  await db.expense.create({
    data: { clinicId: guard.user.clinicId, ...parsed.data },
  })

  revalidatePath("/reportes/ingresos")
  revalidatePath("/reportes/anual")
  return { success: true }
}
