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
