"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { auth } from "../../../auth";
import { requirePermission } from "@/lib/rbac/guards";
import { revalidatePath } from "next/cache";
import type { ActionResponse } from "@/types";
import type { ClinicalHistoryWithLead } from "@/types/clinical";
import type { ClinicalHistory, Lead } from "@prisma/client";

async function getSession() {
  const session = await auth();
  if (!session?.user?.clinicId) throw new Error("No autorizado");
  return session;
}

// ── Get or create clinical history ──────────────────────────────────────────

export async function getClinicalHistory(
  leadId: string
): Promise<ActionResponse<ClinicalHistoryWithLead>> {
  const guard = await requirePermission("dr_clinic", "view");
  if (!guard.authorized) return { success: false, error: guard.error };
  try {
    const parsed = z.string().cuid().safeParse(leadId);
    if (!parsed.success) return { success: false, error: "ID de lead inválido" };

    const session = await getSession();

    const lead = await db.lead.findUnique({
      where: { id: leadId },
      select: { clinicId: true },
    });
    if (!lead || lead.clinicId !== session.user.clinicId) {
      return { success: false, error: "Lead no encontrado" };
    }

    const history = await db.clinicalHistory.upsert({
      where: { leadId },
      create: { leadId },
      update: {},
      include: {
        lead: { select: { id: true, fullName: true, phone: true, treatment: true } },
      },
    });

    return { success: true, data: history as ClinicalHistoryWithLead };
  } catch (error) {
    console.error("[getClinicalHistory]", error);
    return { success: false, error: "Error al obtener la historia clínica" };
  }
}

// ── Save clinical history ────────────────────────────────────────────────────

const SaveSchema = z.object({
  leadId:            z.string().cuid(),
  reasonForConsult:  z.string().max(5000).optional(),
  medicalHistory:    z.string().max(5000).optional(),
  dentalHistory:     z.string().max(5000).optional(),
  odontogramNotes:   z.string().max(5000).optional(),
  proposedTreatment: z.string().max(5000).optional(),
  observations:      z.string().max(5000).optional(),
});

export async function saveClinicalHistory(
  data: z.infer<typeof SaveSchema>
): Promise<ActionResponse<ClinicalHistory>> {
  const guard = await requirePermission("dr_clinic", "edit");
  if (!guard.authorized) return { success: false, error: guard.error };
  try {
    const parsed = SaveSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const session = await getSession();

    const lead = await db.lead.findUnique({
      where: { id: parsed.data.leadId },
      select: { clinicId: true },
    });
    if (!lead || lead.clinicId !== session.user.clinicId) {
      return { success: false, error: "Lead no encontrado" };
    }

    const { leadId, ...fields } = parsed.data;

    const history = await db.clinicalHistory.upsert({
      where: { leadId },
      create: { leadId, ...fields },
      update: fields,
    });

    revalidatePath("/dr-clinic");

    return { success: true, data: history };
  } catch (error) {
    console.error("[saveClinicalHistory]", error);
    return { success: false, error: "Error al guardar la historia clínica" };
  }
}

// ── Save odontogram data ─────────────────────────────────────────────────────

export async function saveOdontogramData(
  data: { leadId: string; odontogramData: object }
): Promise<ActionResponse<ClinicalHistory>> {
  const guard = await requirePermission("dr_clinic", "edit");
  if (!guard.authorized) return { success: false, error: guard.error };
  try {
    const leadIdParsed = z.string().cuid().safeParse(data.leadId);
    if (!leadIdParsed.success) return { success: false, error: "ID de lead inválido" };

    const session = await getSession();
    const lead = await db.lead.findUnique({
      where: { id: leadIdParsed.data },
      select: { clinicId: true },
    });
    if (!lead || lead.clinicId !== session.user.clinicId) {
      return { success: false, error: "Lead no encontrado" };
    }

    // Cast to Prisma's expected JSON type
    const jsonData = data.odontogramData as Parameters<typeof db.clinicalHistory.upsert>[0]["create"]["odontogramData"];

    const history = await db.clinicalHistory.upsert({
      where:  { leadId: leadIdParsed.data },
      create: { leadId: leadIdParsed.data, odontogramData: jsonData },
      update: { odontogramData: jsonData },
    });

    revalidatePath("/dr-clinic");
    return { success: true, data: history };
  } catch (error) {
    console.error("[saveOdontogramData]", error);
    return { success: false, error: "Error al guardar el odontograma" };
  }
}

// ── Search leads/patients ────────────────────────────────────────────────────

type LeadWithClinical = Lead & {
  clinicalHistory: Pick<ClinicalHistory, "id"> | null;
};

export async function searchPatients(
  query: string
): Promise<ActionResponse<LeadWithClinical[]>> {
  try {
    const session = await getSession();

    const results = await db.lead.findMany({
      where: {
        clinicId: session.user.clinicId,
        OR: [
          { fullName: { contains: query, mode: "insensitive" } },
          { phone:    { contains: query } },
        ],
      },
      include: {
        clinicalHistory: { select: { id: true } },
      },
      orderBy: { fullName: "asc" },
      take: 10,
    });

    return { success: true, data: results as LeadWithClinical[] };
  } catch (error) {
    console.error("[searchPatients]", error);
    return { success: false, error: "Error al buscar pacientes" };
  }
}
