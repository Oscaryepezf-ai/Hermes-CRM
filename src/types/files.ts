import type { PatientFile } from "@prisma/client";

export const FILE_CATEGORY_OPTIONS = [
  "Radiografía panorámica",
  "Radiografía lateral de cráneo",
  "Foto intraoral",
  "Foto extraoral",
  "Consentimiento informado",
  "Resultado de laboratorio",
  "Otro",
]

export type PatientFileWithUploader = PatientFile & {
  uploadedBy: { id: string; name: string }
}
