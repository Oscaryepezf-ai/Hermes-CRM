import { db } from "@/lib/db"

/**
 * Helpers de aislamiento multi-tenant: confirman que un id recibido del cliente
 * pertenece a la clínica de la sesión. Úsalos antes de referenciar ids ajenos.
 * Devuelven true/false — nunca confíes en un id del cliente sin pasar por aquí.
 */
export async function patientInClinic(id: string, clinicId: string): Promise<boolean> {
  return !!(await db.patient.findFirst({ where: { id, clinicId }, select: { id: true } }))
}

export async function leadInClinic(id: string, clinicId: string): Promise<boolean> {
  return !!(await db.lead.findFirst({ where: { id, clinicId }, select: { id: true } }))
}

/** Usuario que pertenece a la clínica (principal o multi-sede). */
export async function userInClinic(id: string, clinicId: string): Promise<boolean> {
  return !!(await db.user.findFirst({
    where: { id, OR: [{ clinicId }, { userClinics: { some: { clinicId } } }] },
    select: { id: true },
  }))
}

export async function serviceInClinic(id: string, clinicId: string): Promise<boolean> {
  return !!(await db.service.findFirst({ where: { id, clinicId }, select: { id: true } }))
}

export async function stageInClinic(id: string, clinicId: string): Promise<boolean> {
  return !!(await db.pipelineStage.findFirst({ where: { id, clinicId }, select: { id: true } }))
}
