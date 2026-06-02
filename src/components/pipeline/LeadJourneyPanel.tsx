"use client"

import { useState, useEffect, useCallback } from "react"
import {
  X, UserPlus, BadgeCheck, CalendarCheck, Stethoscope,
  HeartPulse, Clock, XCircle, ArrowRight, MessageCircle,
  FileText, AlertTriangle, Phone,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { STATE_CONFIG, getNextStates } from "@/lib/journey/state-machine"
import { getLeadJourney } from "@/lib/actions/journey"
import { JourneyTimeline } from "./JourneyTimeline"
import { StageTransitionModal } from "./StageTransitionModal"
import { ConvertToPatientModal } from "./ConvertToPatientModal"
import { ScheduleLeadAppointmentModal } from "./ScheduleLeadAppointmentModal"
import { ChatPanel } from "./ChatPanel"
import type { JourneyState, UserRole } from "@prisma/client"
import type { DentalTreatment } from "@prisma/client"
import { formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"

const STATE_ICONS: Record<JourneyState, React.ElementType> = {
  PROSPECTO:       UserPlus,
  CALIFICADO:      BadgeCheck,
  CITA_AGENDADA:   CalendarCheck,
  EN_CONSULTA:     Stethoscope,
  PACIENTE_ACTIVO: HeartPulse,
  INACTIVO:        Clock,
  PERDIDO:         XCircle,
}

type Tab = "resumen" | "chat" | "timeline" | "clinico"

interface LeadJourneyPanelProps {
  leadId:      string
  leadName:    string
  leadPhone:   string
  leadTreatment: DentalTreatment
  clinicName:  string
  userRole:    UserRole
  onClose:     () => void
}

export function LeadJourneyPanel({
  leadId, leadName, leadPhone, leadTreatment, clinicName, userRole, onClose,
}: LeadJourneyPanelProps) {
  const [tab, setTab]                     = useState<Tab>("resumen")
  const [data, setData]                   = useState<Awaited<ReturnType<typeof getLeadJourney>> | null>(null)
  const [loading, setLoading]             = useState(true)
  const [transitionTo, setTransitionTo]   = useState<JourneyState | null>(null)
  const [showConvert, setShowConvert]     = useState(false)
  const [showSchedule, setShowSchedule]   = useState(false)
  const [unreadChat, setUnreadChat]       = useState(false)

  const loadData = useCallback(async () => {
    const res = await getLeadJourney(leadId)
    setData(res)
    setLoading(false)
  }, [leadId])

  useEffect(() => { loadData() }, [loadData])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lead: any = data?.success ? data.data : null
  const journeyState: JourneyState = (lead?.journeyState as JourneyState) ?? "PROSPECTO"
  const stateConfig = STATE_CONFIG[journeyState]
  const StateIcon   = STATE_ICONS[journeyState]
  const nextStates  = getNextStates(journeyState)

  const handleTransitionSuccess = () => {
    loadData()
    setTransitionTo(null)
    setShowConvert(false)
  }

  const canViewClinico = userRole === "ADMIN" || userRole === "DOCTOR"

  const TABS: { id: Tab; label: string; show: boolean }[] = [
    { id: "resumen",  label: "Resumen",  show: true },
    { id: "chat",     label: "Chat",     show: true },
    { id: "timeline", label: "Timeline", show: true },
    { id: "clinico",  label: "Clínico",  show: canViewClinico },
  ]

  return (
    <div className="flex flex-col h-full bg-surface">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-line-subtle">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-semibold text-sm flex-shrink-0">
            {leadName.split(" ").slice(0, 2).map(n => n[0]).join("").toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-sm text-ink-primary truncate">{leadName}</p>
            <div className="flex items-center gap-1.5">
              <Badge className={cn("text-[10px] px-1.5 py-0 font-normal", stateConfig.color)}>
                <StateIcon className="w-2.5 h-2.5 mr-0.5" />
                {stateConfig.label}
              </Badge>
            </div>
          </div>
        </div>
        <button onClick={onClose} className="p-1.5 hover:bg-inset rounded-md transition-colors">
          <X className="w-4 h-4 text-ink-tertiary" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-line-subtle">
        {TABS.filter(t => t.show).map(t => (
          <button
            key={t.id}
            onClick={() => { setTab(t.id); if (t.id === "chat") setUnreadChat(false) }}
            className={cn(
              "flex-1 py-2.5 text-xs font-medium transition-colors relative",
              tab === t.id
                ? "text-indigo-600 border-b-2 border-indigo-600"
                : "text-ink-tertiary hover:text-ink-secondary"
            )}
          >
            {t.label}
            {t.id === "chat" && unreadChat && (
              <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-red-500 rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden">
        {tab === "resumen" && (
          <ResumenTab
            lead={lead}
            loading={loading}
            journeyState={journeyState}
            stateConfig={stateConfig}
            nextStates={nextStates}
            onTransition={state => {
              if (state === "PACIENTE_ACTIVO") setShowConvert(true)
              else setTransitionTo(state)
            }}
            onSwitchToChat={() => setTab("chat")}
            onSchedule={() => setShowSchedule(true)}
          />
        )}

        {tab === "chat" && (
          <ChatPanel
            leadId={leadId}
            leadName={leadName}
            leadPhone={leadPhone}
            leadTreatment={leadTreatment}
            clinicName={clinicName}
            onClose={onClose}
            embedded
            channel={lead?.socialProfiles?.[0]?.channel ?? "WHATSAPP"}
          />
        )}

        {tab === "timeline" && (
          <JourneyTimeline
            leadId={leadId}
            events={(lead?.journeyEvents ?? []) as any}
            onNote={loadData}
          />
        )}

        {tab === "clinico" && canViewClinico && (
          <ClinicTab lead={lead} loading={loading} />
        )}
      </div>

      {/* Modals */}
      {transitionTo && (
        <StageTransitionModal
          leadId={leadId}
          leadName={leadName}
          currentState={journeyState}
          toState={transitionTo}
          onClose={() => setTransitionTo(null)}
          onSuccess={handleTransitionSuccess}
        />
      )}

      {showConvert && (
        <ConvertToPatientModal
          leadId={leadId}
          leadName={leadName}
          leadPhone={leadPhone}
          onClose={() => setShowConvert(false)}
          onSuccess={handleTransitionSuccess}
        />
      )}

      {showSchedule && (
        <ScheduleLeadAppointmentModal
          leadId={leadId}
          leadName={leadName}
          onClose={() => setShowSchedule(false)}
          onSuccess={handleTransitionSuccess}
        />
      )}
    </div>
  )
}

// ── Resumen Tab ────────────────────────────────────────────────────────────────

function ResumenTab({ lead, loading, journeyState, stateConfig, nextStates, onTransition, onSwitchToChat, onSchedule }: {
  lead: any
  loading: boolean
  journeyState: JourneyState
  stateConfig: typeof STATE_CONFIG[JourneyState]
  nextStates: JourneyState[]
  onTransition: (state: JourneyState) => void
  onSwitchToChat: () => void
  onSchedule: () => void
}) {
  const primaryNextStates = nextStates.filter(s => s !== "PERDIDO" && s !== "PROSPECTO")
  const lostState = nextStates.includes("PERDIDO") ? "PERDIDO" : null

  return (
    <div className="overflow-y-auto h-full px-4 py-4 space-y-4">
      {/* Next action */}
      <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3">
        <p className="text-[11px] font-semibold text-indigo-700 uppercase tracking-wider mb-0.5">
          Próxima acción
        </p>
        <p className="text-sm text-indigo-800">{stateConfig.nextAction}</p>
      </div>

      {/* Stats */}
      {lead && (
        <div className="grid grid-cols-3 gap-2">
          <StatCard
            label="En pipeline"
            value={formatDistanceToNow(new Date(lead.createdAt), { locale: es })}
          />
          <StatCard label="Mensajes" value={lead.messages?.length?.toString() ?? "0"} />
          <StatCard label="Citas" value={lead.appointments?.length?.toString() ?? "0"} />
        </div>
      )}

      {/* Primary action buttons */}
      {primaryNextStates.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] font-semibold text-ink-tertiary uppercase tracking-wider">
            Avanzar a
          </p>
          {primaryNextStates.map(state => {
            const cfg = STATE_CONFIG[state]
            return (
              <Button
                key={state}
                variant="outline"
                className="w-full justify-between text-sm"
                onClick={() => onTransition(state)}
              >
                <span>{cfg.label}</span>
                <ArrowRight className="w-4 h-4 text-ink-tertiary" />
              </Button>
            )
          })}
        </div>
      )}

      {/* Quick actions */}
      <div className="space-y-2">
        <p className="text-[11px] font-semibold text-ink-tertiary uppercase tracking-wider">
          Acciones rápidas
        </p>

        {journeyState === "CALIFICADO" && (
          <button
            onClick={onSchedule}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 transition-colors text-sm text-indigo-700 font-medium"
          >
            <CalendarCheck className="w-4 h-4 text-indigo-500" />
            Agendar cita
          </button>
        )}

        <button
          onClick={onSwitchToChat}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-line-soft hover:bg-canvas transition-colors text-sm text-ink-secondary"
        >
          <MessageCircle className="w-4 h-4 text-teal-500" />
          Abrir chat WhatsApp
        </button>
        {(journeyState === "EN_CONSULTA" || journeyState === "PACIENTE_ACTIVO") && (
          <a
            href={`/dr-clinic?leadId=${lead?.id}`}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-line-soft hover:bg-canvas transition-colors text-sm text-ink-secondary"
          >
            <FileText className="w-4 h-4 text-blue-500" />
            Historia clínica
          </a>
        )}
      </div>

      {/* Lost button */}
      {lostState && (
        <div className="pt-2 border-t border-line-subtle">
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-red-500 hover:text-red-600 hover:bg-red-50 text-xs"
            onClick={() => onTransition("PERDIDO")}
          >
            <AlertTriangle className="w-3.5 h-3.5 mr-1.5" />
            Marcar como perdido
          </Button>
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-canvas rounded-lg p-2.5 text-center">
      <p className="text-sm font-semibold text-ink-primary leading-tight">{value}</p>
      <p className="text-[10px] text-ink-tertiary mt-0.5">{label}</p>
    </div>
  )
}

// ── Clínico Tab ────────────────────────────────────────────────────────────────

function ClinicTab({ lead, loading }: { lead: any; loading: boolean }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <p className="text-sm text-ink-tertiary">Cargando...</p>
      </div>
    )
  }

  const ch = lead?.clinicalHistory

  if (!ch) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 px-4">
        <Stethoscope className="w-10 h-10 text-ink-disabled" />
        <p className="text-sm text-ink-tertiary text-center">
          No hay historia clínica registrada
        </p>
        <a
          href={`/dr-clinic?leadId=${lead?.id}`}
          className="inline-flex items-center gap-1.5 text-sm text-indigo-600 hover:underline font-medium"
        >
          Crear historia clínica
          <ArrowRight className="w-3.5 h-3.5" />
        </a>
      </div>
    )
  }

  return (
    <div className="overflow-y-auto h-full px-4 py-4 space-y-3">
      {ch.reasonForConsult && (
        <ClinicalField label="Motivo de consulta" value={ch.reasonForConsult} />
      )}
      {ch.medicalHistory && (
        <ClinicalField label="Historia médica" value={ch.medicalHistory} />
      )}
      {ch.proposedTreatment && (
        <ClinicalField label="Tratamiento propuesto" value={ch.proposedTreatment} />
      )}
      {ch.observations && (
        <ClinicalField label="Observaciones" value={ch.observations} />
      )}
      <a
        href={`/dr-clinic?leadId=${lead?.id}`}
        className="flex items-center gap-1 text-xs text-indigo-600 hover:underline"
      >
        Ver historia completa <ArrowRight className="w-3 h-3" />
      </a>
    </div>
  )
}

function ClinicalField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-semibold text-ink-tertiary uppercase tracking-wider mb-0.5">
        {label}
      </p>
      <p className="text-sm text-ink-secondary whitespace-pre-line">{value}</p>
    </div>
  )
}
