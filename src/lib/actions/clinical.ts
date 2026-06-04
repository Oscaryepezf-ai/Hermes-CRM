"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { auth } from "../../../auth";
import { requirePermission } from "@/lib/rbac/guards";
import { revalidatePath } from "next/cache";
import type { ActionResponse } from "@/types";
import type { ClinicalHistoryWithLead, VisitWithDoctor } from "@/types/clinical";
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

// ── Visit history actions ────────────────────────────────────────────────────

const VisitSchema = z.object({
  leadId:       z.string().cuid(),
  visitDate:    z.string().datetime().optional(),
  procedures:   z.string().max(10000).optional(),
  findings:     z.string().max(10000).optional(),
  medications:  z.string().max(5000).optional(),
  instructions: z.string().max(5000).optional(),
  followUp:     z.string().max(5000).optional(),
  notes:        z.string().max(5000).optional(),
});

export async function createVisit(
  data: z.infer<typeof VisitSchema>
): Promise<ActionResponse<VisitWithDoctor>> {
  const guard = await requirePermission("dr_clinic", "create");
  if (!guard.authorized) return { success: false, error: guard.error };
  try {
    const parsed = VisitSchema.safeParse(data);
    if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };

    const session = await getSession();
    const lead = await db.lead.findUnique({ where: { id: parsed.data.leadId }, select: { clinicId: true } });
    if (!lead || lead.clinicId !== session.user.clinicId) return { success: false, error: "Lead no encontrado" };

    const { leadId, visitDate, ...fields } = parsed.data;
    const visit = await db.clinicalVisit.create({
      data: {
        leadId,
        clinicId:  session.user.clinicId,
        doctorId:  session.user.id,
        visitDate: visitDate ? new Date(visitDate) : new Date(),
        ...fields,
      },
      include: { doctor: { select: { id: true, name: true, avatarUrl: true } } },
    });

    revalidatePath("/dr-clinic");
    return { success: true, data: visit as VisitWithDoctor };
  } catch (error) {
    console.error("[createVisit]", error);
    return { success: false, error: "Error al crear la visita" };
  }
}

export async function updateVisit(
  id: string,
  data: Omit<z.infer<typeof VisitSchema>, "leadId">
): Promise<ActionResponse<VisitWithDoctor>> {
  const guard = await requirePermission("dr_clinic", "edit");
  if (!guard.authorized) return { success: false, error: guard.error };
  try {
    const session = await getSession();
    const existing = await db.clinicalVisit.findFirst({ where: { id, clinicId: session.user.clinicId } });
    if (!existing) return { success: false, error: "Visita no encontrada" };

    const { visitDate, ...fields } = data;
    const visit = await db.clinicalVisit.update({
      where: { id },
      data:  { ...fields, ...(visitDate ? { visitDate: new Date(visitDate) } : {}) },
      include: { doctor: { select: { id: true, name: true, avatarUrl: true } } },
    });

    revalidatePath("/dr-clinic");
    return { success: true, data: visit as VisitWithDoctor };
  } catch (error) {
    console.error("[updateVisit]", error);
    return { success: false, error: "Error al actualizar la visita" };
  }
}

export async function deleteVisit(id: string): Promise<ActionResponse<void>> {
  const guard = await requirePermission("dr_clinic", "edit");
  if (!guard.authorized) return { success: false, error: guard.error };
  try {
    const session = await getSession();
    const existing = await db.clinicalVisit.findFirst({ where: { id, clinicId: session.user.clinicId } });
    if (!existing) return { success: false, error: "Visita no encontrada" };

    await db.clinicalVisit.delete({ where: { id } });
    revalidatePath("/dr-clinic");
    return { success: true, data: undefined };
  } catch (error) {
    console.error("[deleteVisit]", error);
    return { success: false, error: "Error al eliminar la visita" };
  }
}

export async function getVisitsByLead(
  leadId: string
): Promise<ActionResponse<VisitWithDoctor[]>> {
  const guard = await requirePermission("dr_clinic", "view");
  if (!guard.authorized) return { success: false, error: guard.error };
  try {
    const session = await getSession();
    const lead = await db.lead.findUnique({ where: { id: leadId }, select: { clinicId: true } });
    if (!lead || lead.clinicId !== session.user.clinicId) return { success: false, error: "Lead no encontrado" };

    const visits = await db.clinicalVisit.findMany({
      where:   { leadId },
      orderBy: { visitDate: "desc" },
      include: { doctor: { select: { id: true, name: true, avatarUrl: true } } },
    });

    return { success: true, data: visits as VisitWithDoctor[] };
  } catch (error) {
    console.error("[getVisitsByLead]", error);
    return { success: false, error: "Error al obtener las visitas" };
  }
}
