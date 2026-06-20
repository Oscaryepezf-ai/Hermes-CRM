"use server";

import { z } from "zod";
import { put, del } from "@vercel/blob";
import { db } from "@/lib/db";
import { auth } from "../../../auth";
import { requirePermission } from "@/lib/rbac/guards";
import { revalidatePath } from "next/cache";
import type { ActionResponse } from "@/types";
import type { PatientFileWithUploader } from "@/types/files";

async function getSession() {
  const session = await auth();
  if (!session?.user?.clinicId) throw new Error("No autorizado");
  return session;
}

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

export async function uploadPatientFile(
  formData: FormData
): Promise<ActionResponse<PatientFileWithUploader>> {
  const guard = await requirePermission("patients", "edit");
  if (!guard.authorized) return { success: false, error: guard.error };
  try {
    const leadId = formData.get("leadId");
    const category = formData.get("category");
    const notes = formData.get("notes");
    const file = formData.get("file");

    const leadIdParsed = z.string().cuid().safeParse(leadId);
    if (!leadIdParsed.success) return { success: false, error: "ID de lead inválido" };
    if (!(file instanceof File) || file.size === 0) return { success: false, error: "Selecciona un archivo" };
    if (file.size > MAX_FILE_SIZE) return { success: false, error: "El archivo supera el límite de 20MB" };

    const session = await getSession();
    const lead = await db.lead.findUnique({ where: { id: leadIdParsed.data }, select: { clinicId: true } });
    if (!lead || lead.clinicId !== session.user.clinicId) return { success: false, error: "Lead no encontrado" };

    const blob = await put(
      `patients/${leadIdParsed.data}/${Date.now()}-${file.name}`,
      file,
      { access: "public" }
    );

    const record = await db.patientFile.create({
      data: {
        leadId:       leadIdParsed.data,
        clinicId:     session.user.clinicId,
        uploadedById: session.user.id,
        fileName:     file.name,
        fileUrl:      blob.url,
        mimeType:     file.type || null,
        sizeBytes:    file.size,
        category:     typeof category === "string" && category ? category : null,
        notes:        typeof notes === "string" && notes ? notes : null,
      },
      include: { uploadedBy: { select: { id: true, name: true } } },
    });

    revalidatePath(`/patients/${leadIdParsed.data}`);
    return { success: true, data: record };
  } catch (error) {
    console.error("[uploadPatientFile]", error);
    return { success: false, error: "Error al subir el archivo" };
  }
}

export async function getPatientFiles(
  leadId: string
): Promise<ActionResponse<PatientFileWithUploader[]>> {
  const guard = await requirePermission("patients", "view");
  if (!guard.authorized) return { success: false, error: guard.error };
  try {
    const session = await getSession();
    const lead = await db.lead.findUnique({ where: { id: leadId }, select: { clinicId: true } });
    if (!lead || lead.clinicId !== session.user.clinicId) return { success: false, error: "Lead no encontrado" };

    const files = await db.patientFile.findMany({
      where:   { leadId },
      orderBy: { createdAt: "desc" },
      include: { uploadedBy: { select: { id: true, name: true } } },
    });

    return { success: true, data: files };
  } catch (error) {
    console.error("[getPatientFiles]", error);
    return { success: false, error: "Error al obtener los archivos" };
  }
}

export async function deletePatientFile(id: string): Promise<ActionResponse<void>> {
  const guard = await requirePermission("patients", "edit");
  if (!guard.authorized) return { success: false, error: guard.error };
  try {
    const session = await getSession();
    const existing = await db.patientFile.findFirst({ where: { id, clinicId: session.user.clinicId } });
    if (!existing) return { success: false, error: "Archivo no encontrado" };

    await db.patientFile.delete({ where: { id } });
    try {
      await del(existing.fileUrl);
    } catch (blobError) {
      console.error("[deletePatientFile] blob delete failed", blobError);
    }

    revalidatePath(`/patients/${existing.leadId}`);
    return { success: true, data: undefined };
  } catch (error) {
    console.error("[deletePatientFile]", error);
    return { success: false, error: "Error al eliminar el archivo" };
  }
}
