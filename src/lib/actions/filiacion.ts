"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { auth } from "../../../auth";
import { requirePermission } from "@/lib/rbac/guards";
import { revalidatePath } from "next/cache";
import type { ActionResponse } from "@/types";

async function getSession() {
  const session = await auth();
  if (!session?.user?.clinicId) throw new Error("No autorizado");
  return session;
}

const UpdateSchema = z.object({
  leadId: z.string().cuid(),
  fullName: z.string().min(2, "Nombre requerido"),
  nickname: z.string().max(100).optional(),
  phone: z.string().min(7, "Teléfono requerido"),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  documentType: z.enum(["CEDULA", "PASAPORTE", "RUC", "OTRO"]),
  documentNumber: z.string().max(50).optional(),
  birthDate: z.string().optional().or(z.literal("")),
  birthCountry: z.string().max(80).optional(),
  landline: z.string().max(30).optional(),
  address: z.string().max(300).optional(),
  channel: z.enum(["INSTAGRAM", "FACEBOOK", "WHATSAPP", "GOOGLE", "REFERIDO", "TIKTOK", "OTRO"]),
  sex: z.enum(["HOMBRE", "MUJER", ""]).optional(),
  insurer: z.string().max(120).optional(),
  businessLine: z.string().max(120).optional(),
  patientGroup: z.string().max(120).optional(),
  occupation: z.string().max(120).optional(),
  additionalInfo: z.string().max(500).optional(),
  hcNumber: z.string().max(50).optional(),
});

export async function updateFiliacion(
  data: z.infer<typeof UpdateSchema>
): Promise<ActionResponse<void>> {
  const guard = await requirePermission("patients", "edit");
  if (!guard.authorized) return { success: false, error: guard.error };
  try {
    const parsed = UpdateSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const session = await getSession();
    const lead = await db.lead.findUnique({
      where: { id: parsed.data.leadId },
      select: { clinicId: true },
    });
    if (!lead || lead.clinicId !== session.user.clinicId) {
      return { success: false, error: "Contacto no encontrado" };
    }

    const { leadId, sex, birthDate, ...fields } = parsed.data;

    await db.lead.update({
      where: { id: leadId },
      data: {
        ...fields,
        email: fields.email || null,
        nickname: fields.nickname || null,
        documentNumber: fields.documentNumber || null,
        birthCountry: fields.birthCountry || null,
        landline: fields.landline || null,
        address: fields.address || null,
        insurer: fields.insurer || null,
        businessLine: fields.businessLine || null,
        patientGroup: fields.patientGroup || null,
        occupation: fields.occupation || null,
        additionalInfo: fields.additionalInfo || null,
        hcNumber: fields.hcNumber || null,
        sex: sex || null,
        birthDate: birthDate ? new Date(birthDate) : null,
      },
    });

    revalidatePath(`/patients/${leadId}`);
    return { success: true, data: undefined };
  } catch (error) {
    console.error("[updateFiliacion]", error);
    return { success: false, error: "Error al guardar la ficha de filiación" };
  }
}
