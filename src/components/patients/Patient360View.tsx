"use client"

import { useState } from "react"
import Link from "next/link"
import {
  ArrowLeft, Phone, Mail, User, FileText, Smile, Activity,
  Sparkles, Wallet, ClipboardList, Folder, Receipt,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { STATE_CONFIG } from "@/lib/journey/state-machine"
import { FiliacionForm } from "./FiliacionForm"
import { EstadoCuentaTab } from "./EstadoCuentaTab"
import { ComingSoonTab } from "./ComingSoonTab"
import { ClinicalForm } from "@/components/dr-clinic/ClinicalForm"
import { Odontogram } from "@/components/dr-clinic/Odontogram"
import { OrthodonticsForm } from "./OrthodonticsForm"
import { PrescriptionsTab } from "./PrescriptionsTab"
import { ArchivosTab } from "./ArchivosTab"
import { PresupuestosTab } from "./PresupuestosTab"
import type { JourneyState, DocumentType, MarketingChannel, Sex, BudgetStatus } from "@prisma/client"
import type { ClinicalHistoryWithLead, OdontogramData } from "@/types/clinical"
import type { OrthodonticHistoryWithLead, OrthodonticVisitWithDoctor } from "@/types/orthodontics"
import type { PrescriptionWithDoctor } from "@/types/prescriptions"
import type { PatientFileWithUploader } from "@/types/files"
import type { Patient, Appointment, User as DentistUser } from "@prisma/client"

type Tab =
  | "filiacion" | "historia" | "odontograma" | "periodontograma"
  | "ortodoncia" | "cuenta" | "prescripciones" | "archivos" | "presupuestos"

type BudgetSummary = {
  id: string; number: number; status: BudgetStatus; total: number; subtotal: number
  discountPct: number; createdAt: Date | string; validUntil: Date | string | null
  notes: string | null; doctorId: string | null; doctor: { name: string } | null
  items: { description: string; quantity: number; unitPrice: number; discount: number; total: number; serviceId: string | null }[]
}

type PatientWithAppointments = Patient & {
  appointments: (Appointment & { dentist: Pick<DentistUser, "id" | "name"> })[]
}

export type Patient360Lead = {
  id: string
  fullName: string
  nickname: string | null
  phone: string
  email: string | null
  journeyState: JourneyState
  createdAt: Date
  birthDate: Date | null
  hcNumber: string | null
  documentType: DocumentType
  documentNumber: string | null
  birthCountry: string | null
  landline: string | null
  address: string | null
  channel: MarketingChannel
  sex: Sex | null
  insurer: string | null
  businessLine: string | null
  patientGroup: string | null
  occupation: string | null
  additionalInfo: string | null
}

interface Patient360ViewProps {
  lead: Patient360Lead
  clinicalHistory: ClinicalHistoryWithLead | null
  orthodonticHistory: OrthodonticHistoryWithLead | null
  orthodonticVisits: OrthodonticVisitWithDoctor[]
  prescriptions: PrescriptionWithDoctor[]
  files: PatientFileWithUploader[]
  clinicName: string
  patient: PatientWithAppointments | null
  canViewClinico: boolean
  budgets: BudgetSummary[]
  doctors: { id: string; name: string }[]
  clinic: { name: string; logoUrl: string | null; phone: string | null; address: string | null; city: string | null }
}

const TAB_ICONS: Record<Tab, typeof User> = {
  filiacion: User, historia: FileText, odontograma: Smile, periodontograma: Activity,
  ortodoncia: Sparkles, cuenta: Wallet, prescripciones: ClipboardList, archivos: Folder,
  presupuestos: Receipt,
}

const NAV_ITEMS: { id: Tab; label: string; icon: typeof User; requiresClinico?: boolean }[] = [
  { id: "filiacion",       label: "Filiación",        icon: TAB_ICONS.filiacion },
  { id: "historia",        label: "Historia clínica",  icon: TAB_ICONS.historia,  requiresClinico: true },
  { id: "odontograma",     label: "Odontograma",       icon: TAB_ICONS.odontograma, requiresClinico: true },
  { id: "periodontograma", label: "Periodontograma",   icon: TAB_ICONS.periodontograma, requiresClinico: true },
  { id: "ortodoncia",      label: "Ortodoncia",        icon: TAB_ICONS.ortodoncia, requiresClinico: true },
  { id: "cuenta",          label: "Estado de cuenta",  icon: TAB_ICONS.cuenta },
  { id: "presupuestos",    label: "Presupuestos",      icon: TAB_ICONS.presupuestos },
  { id: "prescripciones",  label: "Prescripciones",    icon: TAB_ICONS.prescripciones, requiresClinico: true },
  { id: "archivos",        label: "Archivos",          icon: TAB_ICONS.archivos },
]

export function Patient360View({ lead, clinicalHistory, orthodonticHistory, orthodonticVisits, prescriptions, files, clinicName, patient, canViewClinico, budgets, doctors, clinic }: Patient360ViewProps) {
  const [tab, setTab] = useState<Tab>("filiacion")

  const visibleItems = NAV_ITEMS.filter((item) => !item.requiresClinico || canViewClinico)

  const initials = lead.fullName.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase()
  const age = lead.birthDate
    ? Math.floor((Date.now() - new Date(lead.birthDate).getTime()) / (1000 * 60 * 60 * 24 * 365.25))
    : null
  const stateConfig = STATE_CONFIG[lead.journeyState]
  const odontogramData: OdontogramData = (clinicalHistory?.odontogramData as OdontogramData | null) ?? {}

  return (
    <div className="space-y-4">
      <Link
        href="/patients"
        className="flex items-center gap-1.5 text-sm text-ink-tertiary hover:text-ink-primary transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Volver a pacientes
      </Link>

      <div className="flex gap-6 items-start">
        {/* Left column — patient card + sidebar */}
        <div className="w-[220px] flex-shrink-0 space-y-4">
          <div className="bg-surface border border-line-subtle rounded-[12px] p-4 shadow-card text-center">
            <div className="w-16 h-16 rounded-full bg-brand-50 flex items-center justify-center mx-auto">
              <span className="text-lg font-bold text-brand-600">{initials}</span>
            </div>
            <p className="text-[14px] font-bold text-ink-primary mt-2.5 leading-tight">{lead.fullName}</p>
            {lead.nickname && <p className="text-[11px] text-ink-tertiary">&ldquo;{lead.nickname}&rdquo;</p>}
            {age !== null && <p className="text-[12px] text-ink-tertiary mt-0.5">{age} años</p>}
            <span className={cn("inline-block mt-2 text-[10px] font-medium px-2 py-0.5 rounded-full", stateConfig.color)}>
              {stateConfig.label}
            </span>

            <div className="flex items-center justify-center gap-2 mt-3 pt-3 border-t border-line-subtle">
              <a
                href={`tel:${lead.phone}`}
                className="w-8 h-8 rounded-full bg-inset flex items-center justify-center hover:bg-brand-50 transition-colors"
                title="Llamar"
              >
                <Phone className="w-3.5 h-3.5 text-ink-secondary" />
              </a>
              <a
                href={lead.email ? `mailto:${lead.email}` : undefined}
                className={cn(
                  "w-8 h-8 rounded-full bg-inset flex items-center justify-center transition-colors",
                  lead.email ? "hover:bg-brand-50" : "opacity-40 cursor-not-allowed"
                )}
                title="Enviar email"
              >
                <Mail className="w-3.5 h-3.5 text-ink-secondary" />
              </a>
            </div>
          </div>

          <nav className="bg-surface border border-line-subtle rounded-[12px] overflow-hidden shadow-card">
            {visibleItems.map((item) => {
              const Icon = item.icon
              const isActive = tab === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => setTab(item.id)}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[13px] font-medium transition-ui border-b border-line-subtle last:border-0 text-left",
                    isActive
                      ? "bg-brand-50 text-brand-600"
                      : "text-ink-secondary hover:bg-inset hover:text-ink-primary"
                  )}
                >
                  <Icon className={cn("w-4 h-4 flex-shrink-0", isActive ? "text-brand-500" : "text-ink-tertiary")} />
                  {item.label}
                </button>
              )
            })}
          </nav>
        </div>

        {/* Right column — tab content */}
        <div className="flex-1 min-w-0">
          {tab === "filiacion" && <FiliacionForm lead={lead} lastAppointment={patient?.appointments[0] ?? null} />}

          {tab === "historia" && canViewClinico && (
            clinicalHistory
              ? <ClinicalForm history={clinicalHistory} />
              : <ComingSoonTab title="Historia clínica" description="No se pudo cargar la historia clínica." />
          )}

          {tab === "odontograma" && canViewClinico && (
            <div className="bg-surface border border-line-subtle rounded-[12px] p-6 shadow-card">
              <Odontogram leadId={lead.id} initialData={odontogramData} />
            </div>
          )}

          {tab === "periodontograma" && canViewClinico && (
            <ComingSoonTab title="Periodontograma" description="El registro de periodontograma estará disponible próximamente." />
          )}

          {tab === "ortodoncia" && canViewClinico && (
            orthodonticHistory
              ? <OrthodonticsForm leadId={lead.id} history={orthodonticHistory} visits={orthodonticVisits} />
              : <ComingSoonTab title="Ortodoncia" description="No se pudo cargar la historia de ortodoncia." />
          )}

          {tab === "cuenta" && <EstadoCuentaTab patient={patient} />}

          {tab === "prescripciones" && canViewClinico && (
            <PrescriptionsTab leadId={lead.id} patientName={lead.fullName} clinicName={clinicName} prescriptions={prescriptions} />
          )}

          {tab === "archivos" && (
            <ArchivosTab leadId={lead.id} files={files} />
          )}

          {tab === "presupuestos" && (
            <PresupuestosTab
              leadId={lead.id}
              budgets={budgets}
              doctors={doctors}
              clinic={clinic}
              lead={{ fullName: lead.fullName, phone: lead.phone, email: lead.email }}
              canEdit={canViewClinico}
            />
          )}
        </div>
      </div>
    </div>
  )
}
