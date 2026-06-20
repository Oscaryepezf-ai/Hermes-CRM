import type { Prescription } from "@prisma/client";

export type MedicationLine = {
  name:      string
  dose:      string
  frequency: string
  duration:  string
  notes:     string
}

export const EMPTY_MEDICATION_LINE: MedicationLine = {
  name: "", dose: "", frequency: "", duration: "", notes: "",
}

export type PrescriptionFields = {
  diagnosis:    string
  instructions: string
  medications:  MedicationLine[]
}

export type PrescriptionWithDoctor = Prescription & {
  doctor: { id: string; name: string }
  lead:   { id: string; fullName: string }
}
