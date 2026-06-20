"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { auth } from "../../../auth";
import { requirePermission } from "@/lib/rbac/guards";
import { revalidatePath } from "next/cache";
import type { ActionResponse } from "@/types";
import type { PrescriptionWithDoctor } from "@/types/prescriptions";

async function getSession() {
  const session = await auth();
  if (!session?.user?.clinicId) throw new Error("No autorizado");
  return session;
}

const MedicationLineSchema = z.object({
  name:      z.string().max(200),
  dose:      z.string().max(100),
  frequency: z.string().max(100),
  duration:  z.string().max(100),
  notes:     z.string().max(500).optional(),
});

const CreateSchema = z.object({
  leadId:       z.string().cuid(),
  diagnosis:    z.string().max(2000).optional(),
  instructions: z.string().max(5000).optional(),
  medications:  z.array(MedicationLineSchema).min(1, "Agrega al menos un medicamento"),
});

export async function createPrescription(
  data: z.infer<typeof CreateSchema>
): Promise<ActionResponse<PrescriptionWithDoctor>> {
  const guard = await requirePermission("dr_clinic", "create");
  if (!guard.authorized) return { success: false, error: guard.error };
  try {
    const parsed = CreateSchema.safeParse(data);
    if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };

    const session = await getSession();
    const lead = await db.lead.findUnique({ where: { id: parsed.data.leadId }, select: { clinicId: true } });
    if (!lead || lead.clinicId !== session.user.clinicId) return { success: false, error: "Lead no encontrado" };

    const prescription = await db.prescription.create({
      data: {
        leadId:       parsed.data.leadId,
        clinicId:     session.user.clinicId,
        doctorId:     session.user.id,
        diagnosis:    parsed.data.diagnosis || null,
        instructions: parsed.data.instructions || null,
        medications:  parsed.data.medications,
      },
      include: {
        doctor: { select: { id: true, name: true } },
        lead:   { select: { id: true, fullName: true } },
      },
    });

    revalidatePath(`/patients/${parsed.data.leadId}`);
    return { success: true, data: prescription as unknown as PrescriptionWithDoctor };
  } catch (error) {
    console.error("[createPrescription]", error);
    return { success: false, error: "Error al crear la receta" };
  }
}

export async function getPrescriptionsByLead(
  leadId: string
): Promise<ActionResponse<PrescriptionWithDoctor[]>> {
  const guard = await requirePermission("dr_clinic", "view");
  if (!guard.authorized) return { success: false, error: guard.error };
  try {
    const session = await getSession();
    const lead = await db.lead.findUnique({ where: { id: leadId }, select: { clinicId: true } });
    if (!lead || lead.clinicId !== session.user.clinicId) return { success: false, error: "Lead no encontrado" };

    const prescriptions = await db.prescription.findMany({
      where:   { leadId },
      orderBy: { issuedAt: "desc" },
      include: {
        doctor: { select: { id: true, name: true } },
        lead:   { select: { id: true, fullName: true } },
      },
    });

    return { success: true, data: prescriptions as unknown as PrescriptionWithDoctor[] };
  } catch (error) {
    console.error("[getPrescriptionsByLead]", error);
    return { success: false, error: "Error al obtener las recetas" };
  }
}

export async function deletePrescription(id: string): Promise<ActionResponse<void>> {
  const guard = await requirePermission("dr_clinic", "edit");
  if (!guard.authorized) return { success: false, error: guard.error };
  try {
    const session = await getSession();
    const existing = await db.prescription.findFirst({ where: { id, clinicId: session.user.clinicId } });
    if (!existing) return { success: false, error: "Receta no encontrada" };

    await db.prescription.delete({ where: { id } });
    revalidatePath(`/patients/${existing.leadId}`);
    return { success: true, data: undefined };
  } catch (error) {
    console.error("[deletePrescription]", error);
    return { success: false, error: "Error al eliminar la receta" };
  }
}
