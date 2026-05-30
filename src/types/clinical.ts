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
