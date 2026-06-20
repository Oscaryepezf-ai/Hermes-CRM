"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { auth } from "../../../auth";
import { requirePermission } from "@/lib/rbac/guards";
import { revalidatePath } from "next/cache";
import type { ActionResponse } from "@/types";
import type { OrthodonticHistoryWithLead, OrthodonticVisitWithDoctor } from "@/types/orthodontics";
import type { OrthodonticHistory } from "@prisma/client";
import { completeMission } from "@/lib/onboarding/activation-checklist";

async function getSession() {
  const session = await auth();
  if (!session?.user?.clinicId) throw new Error("No autorizado");
  return session;
}

// ── Get or create orthodontic history ───────────────────────────────────────

export async function getOrthodonticHistory(
  leadId: string
): Promise<ActionResponse<OrthodonticHistoryWithLead>> {
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

    const history = await db.orthodonticHistory.upsert({
      where: { leadId },
      create: { leadId },
      update: {},
      include: {
        lead: { select: { id: true, fullName: true } },
      },
    });

    return { success: true, data: history as OrthodonticHistoryWithLead };
  } catch (error) {
    console.error("[getOrthodonticHistory]", error);
    return { success: false, error: "Error al obtener la historia de ortodoncia" };
  }
}

// ── Save orthodontic history ─────────────────────────────────────────────────

const SaveSchema = z.object({
  leadId: z.string().cuid(),

  chiefComplaint:      z.string().max(5000).optional(),
  priorOrthoTreatment: z.string().max(5000).optional(),

  facialType:      z.string().max(200).optional(),
  facialSymmetry:  z.string().max(200).optional(),
  profileType:     z.string().max(200).optional(),
  lipCompetence:   z.string().max(200).optional(),
  nasolabialAngle: z.string().max(200).optional(),
  facialNotes:     z.string().max(5000).optional(),

  breathingType:   z.string().max(200).optional(),
  swallowingType:  z.string().max(200).optional(),
  habits:          z.array(z.string().max(200)).optional(),
  tmjFindings:     z.string().max(5000).optional(),
  functionalNotes: z.string().max(5000).optional(),

  angleClassRight:       z.string().max(200).optional(),
  angleClassLeft:        z.string().max(200).optional(),
  molarRelationRight:    z.string().max(200).optional(),
  molarRelationLeft:     z.string().max(200).optional(),
  canineRelationRight:   z.string().max(200).optional(),
  canineRelationLeft:    z.string().max(200).optional(),
  overjetMm:             z.number().optional(),
  overbiteMm:            z.number().optional(),
  upperMidlineDeviation: z.string().max(200).optional(),
  lowerMidlineDeviation: z.string().max(200).optional(),
  crowdingUpperMm:       z.number().optional(),
  crowdingLowerMm:       z.number().optional(),
  spacingUpperMm:        z.number().optional(),
  spacingLowerMm:        z.number().optional(),
  crossbite:             z.array(z.string().max(200)).optional(),
  openBite:              z.boolean().optional(),
  curveOfSpee:           z.string().max(200).optional(),
  missingTeeth:          z.string().max(2000).optional(),
  impactedTeeth:         z.string().max(2000).optional(),
  occlusalNotes:         z.string().max(5000).optional(),

  snaAngle:           z.number().optional(),
  snbAngle:           z.number().optional(),
  anbAngle:           z.number().optional(),
  fmaAngle:           z.number().optional(),
  skeletalClass:      z.string().max(200).optional(),
  cephalometricNotes: z.string().max(5000).optional(),

  skeletalDiagnosis:   z.string().max(5000).optional(),
  dentalDiagnosis:     z.string().max(5000).optional(),
  functionalDiagnosis: z.string().max(5000).optional(),

  treatmentPhase:          z.string().max(200).optional(),
  applianceType:           z.string().max(200).optional(),
  extractionsPlanned:      z.string().max(2000).optional(),
  treatmentObjectives:     z.string().max(5000).optional(),
  estimatedDurationMonths: z.number().int().optional(),
});

export async function saveOrthodonticHistory(
  data: z.infer<typeof SaveSchema>
): Promise<ActionResponse<OrthodonticHistory>> {
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

    const history = await db.orthodonticHistory.upsert({
      where: { leadId },
      create: { leadId, ...fields },
      update: fields,
    });

    revalidatePath(`/patients/${leadId}`);

    return { success: true, data: history };
  } catch (error) {
    console.error("[saveOrthodonticHistory]", error);
    return { success: false, error: "Error al guardar la historia de ortodoncia" };
  }
}

// ── Orthodontic control visits ───────────────────────────────────────────────

const VisitSchema = z.object({
  leadId:          z.string().cuid(),
  visitDate:       z.string().datetime().optional(),
  upperArchwire:   z.string().max(200).optional(),
  lowerArchwire:   z.string().max(200).optional(),
  elastics:        z.string().max(200).optional(),
  proceduresDone:  z.string().max(5000).optional(),
  oralHygiene:     z.string().max(200).optional(),
  observations:    z.string().max(5000).optional(),
  nextAppointment: z.string().datetime().optional(),
});

export async function createOrthodonticVisit(
  data: z.infer<typeof VisitSchema>
): Promise<ActionResponse<OrthodonticVisitWithDoctor>> {
  const guard = await requirePermission("dr_clinic", "create");
  if (!guard.authorized) return { success: false, error: guard.error };
  try {
    const parsed = VisitSchema.safeParse(data);
    if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };

    const session = await getSession();
    const lead = await db.lead.findUnique({ where: { id: parsed.data.leadId }, select: { clinicId: true } });
    if (!lead || lead.clinicId !== session.user.clinicId) return { success: false, error: "Lead no encontrado" };

    const { leadId, visitDate, nextAppointment, ...fields } = parsed.data;
    const visit = await db.orthodonticVisit.create({
      data: {
        leadId,
        clinicId:        session.user.clinicId,
        doctorId:        session.user.id,
        visitDate:       visitDate ? new Date(visitDate) : new Date(),
        nextAppointment: nextAppointment ? new Date(nextAppointment) : null,
        ...fields,
      },
      include: { doctor: { select: { id: true, name: true, avatarUrl: true } } },
    });

    revalidatePath(`/patients/${leadId}`);
    completeMission(session.user.clinicId, "REGISTRAR_EVOLUCION").catch(() => {});
    return { success: true, data: visit as OrthodonticVisitWithDoctor };
  } catch (error) {
    console.error("[createOrthodonticVisit]", error);
    return { success: false, error: "Error al registrar el control" };
  }
}

export async function getOrthodonticVisitsByLead(
  leadId: string
): Promise<ActionResponse<OrthodonticVisitWithDoctor[]>> {
  const guard = await requirePermission("dr_clinic", "view");
  if (!guard.authorized) return { success: false, error: guard.error };
  try {
    const session = await getSession();
    const lead = await db.lead.findUnique({ where: { id: leadId }, select: { clinicId: true } });
    if (!lead || lead.clinicId !== session.user.clinicId) return { success: false, error: "Lead no encontrado" };

    const visits = await db.orthodonticVisit.findMany({
      where:   { leadId },
      orderBy: { visitDate: "desc" },
      include: { doctor: { select: { id: true, name: true, avatarUrl: true } } },
    });

    return { success: true, data: visits as OrthodonticVisitWithDoctor[] };
  } catch (error) {
    console.error("[getOrthodonticVisitsByLead]", error);
    return { success: false, error: "Error al obtener los controles" };
  }
}

export async function deleteOrthodonticVisit(id: string): Promise<ActionResponse<void>> {
  const guard = await requirePermission("dr_clinic", "edit");
  if (!guard.authorized) return { success: false, error: guard.error };
  try {
    const session = await getSession();
    const existing = await db.orthodonticVisit.findFirst({ where: { id, clinicId: session.user.clinicId } });
    if (!existing) return { success: false, error: "Control no encontrado" };

    await db.orthodonticVisit.delete({ where: { id } });
    revalidatePath(`/patients/${existing.leadId}`);
    return { success: true, data: undefined };
  } catch (error) {
    console.error("[deleteOrthodonticVisit]", error);
    return { success: false, error: "Error al eliminar el control" };
  }
}
