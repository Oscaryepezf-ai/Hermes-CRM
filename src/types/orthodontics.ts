import type { OrthodonticHistory, OrthodonticVisit } from "@prisma/client";

// ─── Historia de ortodoncia ──────────────────────────────────────────────────

export type OrthodonticFields = {
  chiefComplaint:      string
  priorOrthoTreatment: string

  facialType:      string
  facialSymmetry:  string
  profileType:     string
  lipCompetence:   string
  nasolabialAngle: string
  facialNotes:     string

  breathingType:   string
  swallowingType:  string
  habits:          string[]
  tmjFindings:     string
  functionalNotes: string

  angleClassRight:       string
  angleClassLeft:        string
  molarRelationRight:    string
  molarRelationLeft:     string
  canineRelationRight:   string
  canineRelationLeft:    string
  overjetMm:             string
  overbiteMm:            string
  upperMidlineDeviation: string
  lowerMidlineDeviation: string
  crowdingUpperMm:       string
  crowdingLowerMm:       string
  spacingUpperMm:        string
  spacingLowerMm:        string
  crossbite:             string[]
  openBite:              boolean
  curveOfSpee:           string
  missingTeeth:          string
  impactedTeeth:         string
  occlusalNotes:         string

  snaAngle:           string
  snbAngle:           string
  anbAngle:           string
  fmaAngle:           string
  skeletalClass:      string
  cephalometricNotes: string

  skeletalDiagnosis:   string
  dentalDiagnosis:     string
  functionalDiagnosis: string

  treatmentPhase:          string
  applianceType:           string
  extractionsPlanned:      string
  treatmentObjectives:     string
  estimatedDurationMonths: string
}

export type OrthodonticHistoryWithLead = OrthodonticHistory & {
  lead: { id: string; fullName: string }
}

// ─── Controles / visitas de ortodoncia ───────────────────────────────────────

export type OrthodonticVisitFields = {
  visitDate:       string // ISO date
  upperArchwire:   string
  lowerArchwire:   string
  elastics:        string
  proceduresDone:  string
  oralHygiene:     string
  observations:    string
  nextAppointment: string // ISO date or ""
}

export type OrthodonticVisitWithDoctor = OrthodonticVisit & {
  doctor: { id: string; name: string; avatarUrl: string | null }
}

// ─── Opciones de catálogo (selects) ──────────────────────────────────────────

export const FACIAL_TYPE_OPTIONS = ["Braquifacial", "Mesofacial", "Dolicofacial"]
export const SYMMETRY_OPTIONS = ["Simétrico", "Asimétrico derecho", "Asimétrico izquierdo"]
export const PROFILE_OPTIONS = ["Recto", "Convexo", "Cóncavo"]
export const LIP_COMPETENCE_OPTIONS = ["Competente", "Incompetente", "Potencialmente competente"]

export const BREATHING_OPTIONS = ["Nasal", "Oral", "Mixta"]
export const SWALLOWING_OPTIONS = ["Normal", "Atípica"]
export const HABITS_OPTIONS = [
  "Succión digital", "Succión de chupete", "Interposición lingual",
  "Onicofagia", "Bruxismo", "Respiración oral", "Morder objetos",
]
export const ORAL_HYGIENE_OPTIONS = ["Buena", "Regular", "Mala"]

export const ANGLE_CLASS_OPTIONS = ["Clase I", "Clase II división 1", "Clase II división 2", "Clase III"]
export const MOLAR_RELATION_OPTIONS = ["Clase I", "Clase II", "Clase III"]
export const CANINE_RELATION_OPTIONS = ["Clase I", "Clase II", "Clase III"]
export const MIDLINE_DEVIATION_OPTIONS = ["Centrada", "Desviada a la derecha", "Desviada a la izquierda"]
export const CROSSBITE_OPTIONS = ["Anterior", "Posterior derecho", "Posterior izquierdo", "Bilateral"]
export const CURVE_OF_SPEE_OPTIONS = ["Normal", "Acentuada", "Invertida"]

export const SKELETAL_CLASS_OPTIONS = ["Clase I", "Clase II", "Clase III"]

export const TREATMENT_PHASE_OPTIONS = ["Fase única", "Fase I (interceptiva)", "Fase II (correctiva)", "Retención"]
export const APPLIANCE_TYPE_OPTIONS = [
  "Brackets metálicos", "Brackets estéticos/cerámicos", "Autoligado",
  "Alineadores transparentes", "Aparato funcional", "Aparato de expansión", "Otro",
]
