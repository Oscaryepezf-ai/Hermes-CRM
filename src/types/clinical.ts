import type { ClinicalHistory, Lead } from "@prisma/client";

export type ClinicalFields = {
  reasonForConsult:  string;
  medicalHistory:    string;
  dentalHistory:     string;
  odontogramNotes:   string;
  proposedTreatment: string;
  observations:      string;
};

export type ClinicalHistoryWithLead = ClinicalHistory & {
  lead: Pick<Lead, "id" | "fullName" | "phone" | "treatment">;
};

// Fields the AI returns — all optional (may not fill every field)
export type DictationResult = Partial<ClinicalFields>;

export type RecorderStatus =
  | "idle"
  | "recording"
  | "processing"
  | "done"
  | "error";

// ─── Visit history types ───────────────────────────────────────────────────

export type VisitFields = {
  visitDate:    string   // ISO date
  procedures:   string
  findings:     string
  medications:  string
  instructions: string
  followUp:     string
  notes:        string
}

export type VisitDictationResult = Partial<Omit<VisitFields, "visitDate">>

export type VisitWithDoctor = {
  id:           string
  leadId:       string
  clinicId:     string
  doctorId:     string
  visitDate:    Date
  procedures:   string | null
  findings:     string | null
  medications:  string | null
  instructions: string | null
  followUp:     string | null
  notes:        string | null
  createdAt:    Date
  updatedAt:    Date
  doctor: { id: string; name: string; avatarUrl: string | null }
}

// ─── Odontogram types ──────────────────────────────────────────────────────

export type ToothSurface = 'V' | 'M' | 'O' | 'D' | 'L'

export type SurfaceCondition = '' | 'caries' | 'obturacion_resina' | 'obturacion_amalgama' | 'fractura'

export type ToothCondition =
  | 'sano'
  | 'corona'
  | 'endodoncia'
  | 'ausente'
  | 'extraccion_indicada'
  | 'implante'
  | 'fractura'
  | 'protesis_fija'
  | 'protesis_removible'

export type ToothData = {
  condition: ToothCondition
  surfaces:  Partial<Record<ToothSurface, SurfaceCondition>>
  notes:     string
}

export type OdontogramData = Record<string, ToothData>
