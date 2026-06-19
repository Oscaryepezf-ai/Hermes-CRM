"use client"

import { useState, useTransition } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { updateFiliacion } from "@/lib/actions/filiacion"
import { CHANNEL_LABELS } from "@/types/leads"
import { toast } from "sonner"
import { formatDate } from "@/lib/utils"
import type { Patient360Lead } from "./Patient360View"
import type { Appointment, User as DentistUser } from "@prisma/client"
import type { DocumentType, MarketingChannel, Sex } from "@prisma/client"

const DOCUMENT_LABELS: Record<DocumentType, string> = {
  CEDULA: "Cédula",
  PASAPORTE: "Pasaporte",
  RUC: "RUC",
  OTRO: "Otro",
}

const SEX_LABELS: Record<Sex, string> = {
  HOMBRE: "Hombre",
  MUJER: "Mujer",
}

type FormState = {
  fullName: string
  nickname: string
  phone: string
  email: string
  documentType: DocumentType
  documentNumber: string
  birthDate: string
  birthCountry: string
  landline: string
  address: string
  channel: MarketingChannel
  sex: Sex | ""
  insurer: string
  businessLine: string
  patientGroup: string
  occupation: string
  additionalInfo: string
  hcNumber: string
}

function toFormState(lead: Patient360Lead): FormState {
  return {
    fullName: lead.fullName,
    nickname: lead.nickname ?? "",
    phone: lead.phone,
    email: lead.email ?? "",
    documentType: lead.documentType,
    documentNumber: lead.documentNumber ?? "",
    birthDate: lead.birthDate ? new Date(lead.birthDate).toISOString().slice(0, 10) : "",
    birthCountry: lead.birthCountry ?? "",
    landline: lead.landline ?? "",
    address: lead.address ?? "",
    channel: lead.channel,
    sex: lead.sex ?? "",
    insurer: lead.insurer ?? "",
    businessLine: lead.businessLine ?? "",
    patientGroup: lead.patientGroup ?? "",
    occupation: lead.occupation ?? "",
    additionalInfo: lead.additionalInfo ?? "",
    hcNumber: lead.hcNumber ?? "",
  }
}

interface FiliacionFormProps {
  lead: Patient360Lead
  lastAppointment: (Appointment & { dentist: Pick<DentistUser, "id" | "name"> }) | null
}

export function FiliacionForm({ lead, lastAppointment }: FiliacionFormProps) {
  const [form, setForm] = useState<FormState>(() => toFormState(lead))
  const [isPending, startTransition] = useTransition()

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function handleSave() {
    startTransition(async () => {
      const result = await updateFiliacion({ leadId: lead.id, ...form })
      if (result.success) toast.success("Filiación guardada")
      else toast.error(result.error)
    })
  }

  return (
    <div className="space-y-5">
      <div className="bg-surface border border-line-subtle rounded-[12px] p-5 shadow-card space-y-5">
        <div className="grid grid-cols-3 gap-4">
          <Field label="Nombre completo" required>
            <input className={inputClass} value={form.fullName} onChange={(e) => set("fullName", e.target.value)} />
          </Field>
          <Field label="Apodo">
            <input className={inputClass} value={form.nickname} onChange={(e) => set("nickname", e.target.value)} />
          </Field>
          <Field label="N° HC">
            <input className={inputClass} value={form.hcNumber} onChange={(e) => set("hcNumber", e.target.value)} />
          </Field>

          <Field label="Tipo de documento">
            <select className={inputClass} value={form.documentType} onChange={(e) => set("documentType", e.target.value as DocumentType)}>
              {Object.entries(DOCUMENT_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </Field>
          <Field label="N° de documento">
            <input className={inputClass} value={form.documentNumber} onChange={(e) => set("documentNumber", e.target.value)} />
          </Field>
          <Field label="Teléfono" required>
            <input className={inputClass} value={form.phone} onChange={(e) => set("phone", e.target.value)} />
          </Field>

          <Field label="Email">
            <input type="email" className={inputClass} value={form.email} onChange={(e) => set("email", e.target.value)} />
          </Field>
          <Field label="Tel. fijo">
            <input className={inputClass} value={form.landline} onChange={(e) => set("landline", e.target.value)} />
          </Field>
          <Field label="F. nacimiento">
            <input type="date" className={inputClass} value={form.birthDate} onChange={(e) => set("birthDate", e.target.value)} />
          </Field>

          <Field label="País de nacimiento">
            <input className={inputClass} value={form.birthCountry} onChange={(e) => set("birthCountry", e.target.value)} />
          </Field>
          <Field label="Sexo">
            <select className={inputClass} value={form.sex} onChange={(e) => set("sex", e.target.value as Sex | "")}>
              <option value="">Seleccionar</option>
              {Object.entries(SEX_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </Field>
          <Field label="Fuente de captación">
            <select className={inputClass} value={form.channel} onChange={(e) => set("channel", e.target.value as MarketingChannel)}>
              {Object.entries(CHANNEL_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </Field>

          <Field label="Dirección" className="col-span-3">
            <input className={inputClass} value={form.address} onChange={(e) => set("address", e.target.value)} />
          </Field>

          <Field label="Aseguradora">
            <input className={inputClass} value={form.insurer} onChange={(e) => set("insurer", e.target.value)} />
          </Field>
          <Field label="Línea de negocio">
            <input className={inputClass} value={form.businessLine} onChange={(e) => set("businessLine", e.target.value)} />
          </Field>
          <Field label="Grupo">
            <input className={inputClass} value={form.patientGroup} onChange={(e) => set("patientGroup", e.target.value)} />
          </Field>

          <Field label="Ocupación">
            <input className={inputClass} value={form.occupation} onChange={(e) => set("occupation", e.target.value)} />
          </Field>
          <Field label="Adicional" className="col-span-2">
            <input className={inputClass} value={form.additionalInfo} onChange={(e) => set("additionalInfo", e.target.value)} />
          </Field>
        </div>

        <div className="pt-3 border-t border-line-subtle flex items-center justify-between">
          <p className="text-[12px] text-ink-tertiary">
            Última cita:{" "}
            {lastAppointment
              ? `${formatDate(lastAppointment.scheduledAt)} · Dr. ${lastAppointment.dentist.name}`
              : "Sin citas registradas"}
          </p>
          <Button onClick={handleSave} disabled={isPending}>
            {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Guardar cambios
          </Button>
        </div>
      </div>
    </div>
  )
}

const inputClass =
  "w-full h-9 rounded-lg border border-line-subtle bg-transparent px-2.5 text-[13px] text-ink-primary outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"

function Field({ label, required, className, children }: {
  label: string
  required?: boolean
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={className}>
      <label className="text-[12px] font-medium text-ink-secondary block mb-1.5">
        {label}{required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  )
}
