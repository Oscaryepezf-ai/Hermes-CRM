"use server"

import { z } from "zod"
import bcrypt from "bcryptjs"
import { db } from "@/lib/db"
import { slugify } from "@/lib/utils"
import { sendWhatsAppOTP, verifyWhatsAppOTP } from "@/lib/auth/whatsapp-otp"

// ── Paso 0a: Solicitar código de verificación ────────────
const RequestOtpSchema = z.object({
  phone: z.string().regex(/^\+\d{10,15}$/, "Formato de teléfono inválido"),
})

export async function requestPhoneVerification(
  data: z.infer<typeof RequestOtpSchema>
) {
  const parsed = RequestOtpSchema.safeParse(data)
  if (!parsed.success) return { success: false as const, error: "Número inválido" }

  const existing = await db.user.findUnique({ where: { phone: parsed.data.phone } })
  if (existing) return { success: false as const, error: "Este número ya está registrado" }

  return sendWhatsAppOTP(parsed.data.phone)
}

// ── Paso 0b: Verificar código y crear cuenta ─────────────
const CompleteRegistrationSchema = z.object({
  name:     z.string().min(2).max(80),
  lastName: z.string().min(2).max(80),
  country:  z.string().min(2),
  phone:    z.string().regex(/^\+\d{10,15}$/),
  email:    z.string().email(),
  code:     z.string().length(6),
  password: z.string().min(8),
})

export async function completeRegistration(
  data: z.infer<typeof CompleteRegistrationSchema>
) {
  const parsed = CompleteRegistrationSchema.safeParse(data)
  if (!parsed.success) return { success: false as const, error: parsed.error.issues[0].message }

  const existingEmail = await db.user.findUnique({ where: { email: parsed.data.email } })
  if (existingEmail) return { success: false as const, error: "Ya existe una cuenta con ese email" }

  const existingPhone = await db.user.findUnique({ where: { phone: parsed.data.phone } })
  if (existingPhone) return { success: false as const, error: "Este número ya está registrado" }

  const verification = await verifyWhatsAppOTP(parsed.data.phone, parsed.data.code)
  if (!verification.success) return { success: false as const, error: verification.error }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12)

  const baseSlug = slugify(`clinica-de-${parsed.data.name}`)
  let slug = baseSlug
  let suffix = 1
  while (await db.clinic.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${suffix++}`
  }

  const result = await db.$transaction(async (tx) => {
    const clinic = await tx.clinic.create({
      data: {
        name:    `Clínica de ${parsed.data.name}`,
        slug,
        country: parsed.data.country,
      },
    })

    const user = await tx.user.create({
      data: {
        name:          `${parsed.data.name} ${parsed.data.lastName}`,
        email:         parsed.data.email,
        phone:         parsed.data.phone,
        phoneVerified: true,
        password:      passwordHash,
        role:          "ADMIN",
        clinicId:      clinic.id,
      },
    })

    await tx.activationMission.create({
      data: { clinicId: clinic.id, missionKey: "CUENTA_CREADA", completed: true, completedAt: new Date() },
    })
    await tx.activationMission.createMany({
      data: (["CREAR_CITA", "REGISTRAR_EVOLUCION"] as const).map((key) => ({
        clinicId: clinic.id,
        missionKey: key,
      })),
    })

    return { clinic, user }
  })

  return { success: true as const, clinicId: result.clinic.id, userId: result.user.id }
}
