"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { auth } from "../../../auth";
import { requirePermission } from "@/lib/rbac/guards";
import type { ActionResponse, LeadWithStage } from "@/types";
import type { LeadWithAssignee, LeadForBoard } from "@/types/leads";
import type { LeadStatus } from "@prisma/client";

const createLeadSchema = z.object({
  fullName: z.string().min(2, "Nombre requerido"),
  phone: z.string().min(7, "Teléfono requerido"),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  source: z.enum(["REFERIDO", "INSTAGRAM", "FACEBOOK", "GOOGLE", "TIKTOK", "WHATSAPP", "OTRO"]),
  interest: z.string().optional(),
  estimatedValue: z.number().positive().optional(),
  notes: z.string().optional(),
  stageId: z.string().optional(),
});

async function getSession() {
  const session = await auth();
  if (!session?.user?.clinicId) throw new Error("No autorizado");
  return session;
}

export async function createLead(
  data: z.infer<typeof createLeadSchema>
): Promise<ActionResponse<{ id: string }>> {
  try {
    const session = await getSession();
    const parsed = createLeadSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const firstStage = await db.pipelineStage.findFirst({
      where: { clinicId: session.user.clinicId },
      orderBy: { order: "asc" },
    });

    if (!firstStage) {
      return { success: false, error: "No hay etapas configuradas en el pipeline" };
    }

    const lead = await db.lead.create({
      data: {
        fullName: parsed.data.fullName,
        phone: parsed.data.phone,
        email: parsed.data.email || null,
        source: parsed.data.source,
        channel: parsed.data.source,
        interest: parsed.data.interest || null,
        estimatedValue: parsed.data.estimatedValue || null,
        notes: parsed.data.notes || null,
        stageId: parsed.data.stageId || firstStage.id,
        clinicId: session.user.clinicId,
      },
    });

    await db.leadHistory.create({
      data: {
        leadId: lead.id,
        userId: session.user.id,
        fromStage: null,
        toStage: firstStage.name,
        note: "Lead creado",
      },
    });

    return { success: true, data: { id: lead.id } };
  } catch (error) {
    console.error("[createLead]", error);
    return { success: false, error: "Error al crear el lead" };
  }
}

export async function updateLeadStage(
  leadId: string,
  newStageId: string,
  note?: string
): Promise<ActionResponse<void>> {
  try {
    const session = await getSession();

    const lead = await db.lead.findUnique({
      where: { id: leadId },
      include: { stage: true },
    });

    if (!lead || lead.clinicId !== session.user.clinicId) {
      return { success: false, error: "Lead no encontrado" };
    }

    const newStage = await db.pipelineStage.findUnique({
      where: { id: newStageId },
    });

    if (!newStage || newStage.clinicId !== session.user.clinicId) {
      return { success: false, error: "Etapa no válida" };
    }

    await db.lead.update({
      where: { id: leadId },
      data: { stageId: newStageId },
    });

    await db.leadHistory.create({
      data: {
        leadId,
        userId: session.user.id,
        fromStage: lead.stage?.name ?? null,
        toStage: newStage.name,
        note: note || null,
      },
    });

    return { success: true, data: undefined };
  } catch (error) {
    console.error("[updateLeadStage]", error);
    return { success: false, error: "Error al mover el lead" };
  }
}

export async function convertLeadToPatient(
  leadId: string
): Promise<ActionResponse<{ patientId: string }>> {
  try {
    const session = await getSession();

    const lead = await db.lead.findUnique({
      where: { id: leadId },
    });

    if (!lead || lead.clinicId !== session.user.clinicId) {
      return { success: false, error: "Lead no encontrado" };
    }

    if (lead.convertedAt) {
      return { success: false, error: "Este lead ya fue convertido" };
    }

    const convertedStage = await db.pipelineStage.findFirst({
      where: { clinicId: session.user.clinicId, name: "Convertido" },
    });

    const patient = await db.patient.create({
      data: {
        fullName: lead.fullName,
        phone: lead.phone,
        email: lead.email,
        clinicId: session.user.clinicId,
      },
    });

    await db.lead.update({
      where: { id: leadId },
      data: {
        convertedAt: new Date(),
        patientId: patient.id,
        stageId: convertedStage?.id ?? lead.stageId,
      },
    });

    if (convertedStage) {
      await db.leadHistory.create({
        data: {
          leadId,
          userId: session.user.id,
          fromStage: lead.stageId,
          toStage: "Convertido",
          note: "Convertido a paciente",
        },
      });
    }

    return { success: true, data: { patientId: patient.id } };
  } catch (error) {
    console.error("[convertLeadToPatient]", error);
    return { success: false, error: "Error al convertir el lead" };
  }
}

export async function deleteLead(leadId: string): Promise<ActionResponse<void>> {
  const guard = await requirePermission("pipeline", "delete");
  if (!guard.authorized) return { success: false, error: guard.error };
  try {
    const session = await getSession();

    const lead = await db.lead.findUnique({ where: { id: leadId } });

    if (!lead || lead.clinicId !== session.user.clinicId) {
      return { success: false, error: "Lead no encontrado" };
    }

    await db.lead.delete({ where: { id: leadId } });

    return { success: true, data: undefined };
  } catch (error) {
    console.error("[deleteLead]", error);
    return { success: false, error: "Error al eliminar el lead" };
  }
}

export async function getLeadsByClinic(): Promise<ActionResponse<LeadWithStage[]>> {
  try {
    const session = await getSession();

    const leads = await db.lead.findMany({
      where: { clinicId: session.user.clinicId },
      include: {
        stage: true,
        history: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: {
            user: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return { success: true, data: leads as LeadWithStage[] };
  } catch (error) {
    console.error("[getLeadsByClinic]", error);
    return { success: false, error: "Error al obtener los leads" };
  }
}

export async function getLeadsForTable(): Promise<ActionResponse<LeadWithAssignee[]>> {
  try {
    const session = await getSession();

    const leads = await db.lead.findMany({
      where: { clinicId: session.user.clinicId },
      select: {
        id: true,
        fullName: true,
        phone: true,
        email: true,
        status: true,
        treatment: true,
        channel: true,
        lastContactAt: true,
        createdAt: true,
        assignedTo: {
          select: { id: true, name: true, avatarUrl: true },
        },
      },
      orderBy: [
        { lastContactAt: { sort: "desc", nulls: "last" } },
        { createdAt: "desc" },
      ],
    });

    return { success: true, data: leads as LeadWithAssignee[] };
  } catch (error) {
    console.error("[getLeadsForTable]", error);
    return { success: false, error: "Error al obtener los leads" };
  }
}

export async function getLeadHistory(
  leadId: string
): Promise<ActionResponse<Awaited<ReturnType<typeof db.leadHistory.findMany>>>> {
  try {
    const session = await getSession();

    const lead = await db.lead.findUnique({ where: { id: leadId } });
    if (!lead || lead.clinicId !== session.user.clinicId) {
      return { success: false, error: "Lead no encontrado" };
    }

    const history = await db.leadHistory.findMany({
      where: { leadId },
      include: {
        user: { select: { id: true, name: true, avatarUrl: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return { success: true, data: history };
  } catch (error) {
    console.error("[getLeadHistory]", error);
    return { success: false, error: "Error al obtener el historial" };
  }
}

export async function updateLeadStatus(
  leadId: string,
  newStatus: LeadStatus
): Promise<ActionResponse<void>> {
  try {
    const session = await getSession();

    const lead = await db.lead.findUnique({ where: { id: leadId } });
    if (!lead || lead.clinicId !== session.user.clinicId) {
      return { success: false, error: "Lead no encontrado" };
    }

    await db.lead.update({
      where: { id: leadId },
      data: { status: newStatus, lastContactAt: new Date() },
    });

    return { success: true, data: undefined };
  } catch (error) {
    console.error("[updateLeadStatus]", error);
    return { success: false, error: "Error al actualizar el estado" };
  }
}

export async function getLeadsForBoard(): Promise<ActionResponse<LeadForBoard[]>> {
  try {
    const session = await getSession();

    const leads = await db.lead.findMany({
      where: { clinicId: session.user.clinicId },
      select: {
        id: true,
        fullName: true,
        phone: true,
        status: true,
        stageId: true,
        journeyState: true,
        treatment: true,
        channel: true,
        lastContactAt: true,
        updatedAt: true,
        notes: true,
        isAgentHandled: true,
        isNewPatientOfMonth: true,
        assignedTo: {
          select: { id: true, name: true, avatarUrl: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return { success: true, data: leads as LeadForBoard[] };
  } catch (error) {
    console.error("[getLeadsForBoard]", error);
    return { success: false, error: "Error al obtener el pipeline" };
  }
}
