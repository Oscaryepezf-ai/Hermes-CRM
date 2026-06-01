"use client"

import { useState } from "react"
import {
  UserPlus, BadgeCheck, CalendarCheck, Stethoscope, HeartPulse,
  Clock, XCircle, MessageCircle, Phone, Bot, FileText, Calendar,
  CheckCircle2, BanIcon, AlertCircle,
} from "lucide-react"
import { formatDistanceToNow, format } from "date-fns"
import { es } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { logJourneyEvent } from "@/lib/actions/journey"
import { toast } from "sonner"
import type { EventType, JourneyState } from "@prisma/client"

type JourneyEventWithUser = {
  id: string
  type: EventType
  fromState: JourneyState | null
  toState: JourneyState | null
  note: string | null
  isAutomatic: boolean
  createdAt: Date
  metadata: unknown
  user: { name: string; role: string; avatarUrl: string | null } | null
}

interface JourneyTimelineProps {
  leadId:  string
  events:  JourneyEventWithUser[]
  onNote?: () => void
}

const EVENT_CONFIG: Record<EventType, {
  label:  string
  icon:   React.ElementType
  color:  string
}> = {
  STATE_CHANGED:        { label: "Estado actualizado",    icon: CheckCircle2,  color: "bg-indigo-500"  },
  MESSAGE_SENT:         { label: "Mensaje enviado",        icon: MessageCircle, color: "bg-teal-500"    },
  MESSAGE_RECEIVED:     { label: "Mensaje recibido",       icon: MessageCircle, color: "bg-teal-400"    },
  CALL_MADE:            { label: "Llamada realizada",      icon: Phone,         color: "bg-blue-500"    },
  QUICK_REPLY_USED:     { label: "Respuesta rápida",       icon: MessageCircle, color: "bg-teal-500"    },
  APPOINTMENT_CREATED:  { label: "Cita agendada",          icon: CalendarCheck, color: "bg-amber-500"   },
  APPOINTMENT_CONFIRMED:{ label: "Cita confirmada",        icon: CheckCircle2,  color: "bg-green-500"   },
  APPOINTMENT_CANCELLED:{ label: "Cita cancelada",         icon: BanIcon,       color: "bg-red-500"     },
  APPOINTMENT_COMPLETED:{ label: "Cita completada",        icon: CalendarCheck, color: "bg-green-600"   },
  NO_SHOW:              { label: "No asistió",             icon: AlertCircle,   color: "bg-orange-500"  },
  CLINICAL_NOTE_ADDED:  { label: "Nota clínica agregada",  icon: FileText,      color: "bg-blue-500"    },
  DICTATION_USED:       { label: "Dictado utilizado",      icon: Stethoscope,   color: "bg-blue-400"    },
  CONVERTED_TO_PATIENT: { label: "Convertido a paciente",  icon: HeartPulse,    color: "bg-green-600"   },
  LOST:                 { label: "Lead perdido",            icon: XCircle,       color: "bg-red-500"     },
  AI_QUALIFIED:         { label: "Calificado por IA",      icon: Bot,           color: "bg-indigo-500"  },
  AI_SCHEDULED:         { label: "Cita agendada por IA",   icon: Bot,           color: "bg-indigo-500"  },
  AI_REMINDER_SENT:     { label: "Recordatorio enviado",   icon: Bot,           color: "bg-indigo-400"  },
  AI_REENGAGED:         { label: "Reactivado por IA",      icon: Bot,           color: "bg-violet-500"  },
}

const STATE_LABELS: Record<JourneyState, string> = {
  PROSPECTO:       "Prospecto",
  CALIFICADO:      "Calificado",
  CITA_AGENDADA:   "Cita agendada",
  EN_CONSULTA:     "En consulta",
  PACIENTE_ACTIVO: "Paciente activo",
  INACTIVO:        "Inactivo",
  PERDIDO:         "Perdido",
}

function getInitials(name: string) {
  return name.split(" ").slice(0, 2).map(n => n[0]).join("").toUpperCase()
}

export function JourneyTimeline({ leadId, events, onNote }: JourneyTimelineProps) {
  const [note, setNote] = useState("")
  const [saving, setSaving] = useState(false)

  const handleSaveNote = async () => {
    if (!note.trim()) return
    setSaving(true)
    const res = await logJourneyEvent({ leadId, type: "CLINICAL_NOTE_ADDED", note: note.trim() })
    if (res.success) {
      toast.success("Nota guardada")
      setNote("")
      onNote?.()
    } else {
      toast.error(res.error)
    }
    setSaving(false)
  }

  if (events.length === 0) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-ink-tertiary">
            <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Sin eventos registrados</p>
          </div>
        </div>
        <NoteInput note={note} setNote={setNote} saving={saving} onSave={handleSaveNote} />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-0">
        {events.map((event, index) => {
          const config = EVENT_CONFIG[event.type] ?? {
            label: event.type, icon: Clock, color: "bg-gray-400",
          }
          const Icon = config.icon
          const isLast = index === events.length - 1

          return (
            <div key={event.id} className="flex gap-3">
              {/* Line + dot */}
              <div className="flex flex-col items-center">
                <div className={cn("w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 z-10", config.color)}>
                  <Icon className="w-3.5 h-3.5 text-white" />
                </div>
                {!isLast && <div className="w-px flex-1 bg-gray-200 my-1" />}
              </div>

              {/* Content */}
              <div className={cn("pb-4 min-w-0 flex-1", isLast && "pb-2")}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink-primary leading-tight">
                      {config.label}
                      {event.fromState && event.toState && (
                        <span className="ml-1.5 text-xs font-normal text-ink-tertiary">
                          {STATE_LABELS[event.fromState]} → {STATE_LABELS[event.toState]}
                        </span>
                      )}
                    </p>

                    {event.note && (
                      <p className="text-xs text-ink-secondary mt-0.5 leading-snug">{event.note}</p>
                    )}

                    <div className="flex items-center gap-1.5 mt-1">
                      {event.isAutomatic ? (
                        <span className="flex items-center gap-1 text-[11px] text-indigo-500 italic">
                          <Bot className="w-3 h-3" /> Hermes AI
                        </span>
                      ) : event.user ? (
                        <span className="text-[11px] text-ink-tertiary">{event.user.name}</span>
                      ) : null}
                    </div>
                  </div>

                  <span className="text-[11px] text-ink-tertiary flex-shrink-0 mt-0.5">
                    {formatDistanceToNow(new Date(event.createdAt), { addSuffix: true, locale: es })}
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <NoteInput note={note} setNote={setNote} saving={saving} onSave={handleSaveNote} />
    </div>
  )
}

function NoteInput({ note, setNote, saving, onSave }: {
  note: string
  setNote: (v: string) => void
  saving: boolean
  onSave: () => void
}) {
  return (
    <div className="border-t border-line-subtle p-3 space-y-2">
      <Textarea
        placeholder="Agregar nota al timeline..."
        value={note}
        onChange={e => setNote(e.target.value)}
        rows={2}
        className="text-sm resize-none"
      />
      <Button
        size="sm"
        onClick={onSave}
        disabled={!note.trim() || saving}
        className="w-full"
      >
        {saving ? "Guardando..." : "Guardar nota"}
      </Button>
    </div>
  )
}
