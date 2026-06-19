import { db } from "@/lib/db"
import type { MissionKey } from "@prisma/client"

export const MISSION_CONFIG: Record<MissionKey, {
  label:       string
  description: string
  ctaLink:     string
}> = {
  CUENTA_CREADA: {
    label:       "Cuenta creada",
    description: "Empieza a digitalizar",
    ctaLink:     "",
  },
  CREAR_CITA: {
    label:       "Crear cita",
    description: "Agenda tu primer paciente en el calendario",
    ctaLink:     "/agenda",
  },
  REGISTRAR_EVOLUCION: {
    label:       "Registrar evolución",
    description: "Crea una nota de evolución a tu paciente",
    ctaLink:     "/dr-clinic",
  },
}

// ── Obtener el estado del checklist de una clínica ───────
export async function getActivationChecklist(clinicId: string) {
  const missions = await db.activationMission.findMany({
    where:   { clinicId },
    orderBy: { createdAt: "asc" },
  })

  const completed = missions.filter((m) => m.completed).length
  const total     = missions.length
  const allDone   = total > 0 && completed === total

  const clinic = await db.clinic.findUnique({
    where:  { id: clinicId },
    select: { rewardClaimed: true },
  })

  return {
    missions: missions.map((m) => ({ ...m, ...MISSION_CONFIG[m.missionKey] })),
    completed,
    total,
    allDone,
    rewardClaimed:   clinic?.rewardClaimed ?? false,
    rewardAvailable: allDone && !(clinic?.rewardClaimed ?? false),
  }
}

// ── Marcar una misión como completada ────────────────────
// Llamar desde las Server Actions reales (crear cita, registrar evolución, etc.)
export async function completeMission(
  clinicId:   string,
  missionKey: Exclude<MissionKey, "CUENTA_CREADA">
): Promise<void> {
  await db.activationMission.updateMany({
    where: { clinicId, missionKey, completed: false },
    data:  { completed: true, completedAt: new Date() },
  })
}

// ── Reclamar la recompensa ────────────────────────────────
export async function claimReward(clinicId: string): Promise<{ success: boolean }> {
  const checklist = await getActivationChecklist(clinicId)
  if (!checklist.allDone || checklist.rewardClaimed) return { success: false }

  await db.clinic.update({
    where: { id: clinicId },
    data:  { rewardClaimed: true, rewardClaimedAt: new Date() },
  })

  return { success: true }
}
