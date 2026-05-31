"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { auth } from "../../../auth";
import { requirePermission } from "@/lib/rbac/guards";
import type { ActionResponse, PatientWithAppointments } from "@/types";

const patientSchema = z.object({
  fullName: z.string().min(2, "Nombre requerido"),
  phone: z.string().min(7, "Teléfono requerido"),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  birthDate: z.string().optional(),
  cedula: z.string().optional(),
  address: z.string().optional(),
});

async function getSession() {
  const session = await auth();
  if (!session?.user?.clinicId) throw new Error("No autorizado");
  return session;
}

export async function createPatient(
  data: z.infer<typeof patientSchema>
): Promise<ActionResponse<{ id: string }>> {
  const guard = await requirePermission("patients", "create");
  if (!guard.authorized) return { success: false, error: guard.error };
  try {
    const session = await getSession();
    const parsed = patientSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const patient = await db.patient.create({
      data: {
        fullName: parsed.data.fullName,
        phone: parsed.data.phone,
        email: parsed.data.email || null,
        birthDate: parsed.data.birthDate ? new Date(parsed.data.birthDate) : null,
        cedula: parsed.data.cedula || null,
        address: parsed.data.address || null,
        clinicId: session.user.clinicId,
      },
    });

    return { success: true, data: { id: patient.id } };
  } catch (error) {
    console.error("[createPatient]", error);
    return { success: false, error: "Error al crear el paciente" };
  }
}

export async function updatePatient(
  id: string,
  data: z.infer<typeof patientSchema>
): Promise<ActionResponse<void>> {
  const guard = await requirePermission("patients", "edit");
  if (!guard.authorized) return { success: false, error: guard.error };
  try {
    const session = await getSession();
    const parsed = patientSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const patient = await db.patient.findUnique({ where: { id } });
    if (!patient || patient.clinicId !== session.user.clinicId) {
      return { success: false, error: "Paciente no encontrado" };
    }

    await db.patient.update({
      where: { id },
      data: {
        fullName: parsed.data.fullName,
        phone: parsed.data.phone,
        email: parsed.data.email || null,
        birthDate: parsed.data.birthDate ? new Date(parsed.data.birthDate) : null,
        cedula: parsed.data.cedula || null,
        address: parsed.data.address || null,
      },
    });

    return { success: true, data: undefined };
  } catch (error) {
    console.error("[updatePatient]", error);
    return { success: false, error: "Error al actualizar el paciente" };
  }
}

export async function getPatientsByClinic(): Promise<
  ActionResponse<Awaited<ReturnType<typeof db.patient.findMany>>>
> {
  try {
    const session = await getSession();

    const patients = await db.patient.findMany({
      where: { clinicId: session.user.clinicId },
      include: {
        appointments: {
          orderBy: { scheduledAt: "desc" },
          take: 1,
        },
        _count: { select: { appointments: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return { success: true, data: patients };
  } catch (error) {
    console.error("[getPatientsByClinic]", error);
    return { success: false, error: "Error al obtener los pacientes" };
  }
}

export async function getPatientById(
  id: string
): Promise<ActionResponse<PatientWithAppointments>> {
  try {
    const session = await getSession();

    const patient = await db.patient.findUnique({
      where: { id },
      include: {
        appointments: {
          include: {
            dentist: { select: { id: true, name: true } },
          },
          orderBy: { scheduledAt: "desc" },
        },
      },
    });

    if (!patient || patient.clinicId !== session.user.clinicId) {
      return { success: false, error: "Paciente no encontrado" };
    }

    return { success: true, data: patient as PatientWithAppointments };
  } catch (error) {
    console.error("[getPatientById]", error);
    return { success: false, error: "Error al obtener el paciente" };
  }
}
