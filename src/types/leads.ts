import type { LucideIcon } from "lucide-react"
import type { LeadStatus, DentalTreatment, MarketingChannel, JourneyState } from "@prisma/client"
import {
  AtSign,
  Share2,
  MessageCircle,
  Globe,
  Users,
  Music,
  HelpCircle,
} from "lucide-react"

export type { LeadStatus, DentalTreatment, MarketingChannel, JourneyState }

export type LeadForBoard = {
  id: string
  fullName: string
  phone: string
  status: LeadStatus
  stageId: string | null
  journeyState: JourneyState
  treatment: DentalTreatment
  channel: MarketingChannel
  assignedTo: { id: string; name: string; avatarUrl: string | null } | null
  lastContactAt: Date | null
  updatedAt: Date
  notes: string | null
  isAgentHandled: boolean
  isNewPatientOfMonth: boolean
}

export type LeadWithAssignee = {
  id: string
  fullName: string
  phone: string
  email: string | null
  status: LeadStatus
  treatment: DentalTreatment
  channel: MarketingChannel
  assignedTo: { id: string; name: string; avatarUrl: string | null } | null
  lastContactAt: Date | null
  createdAt: Date
}

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  NUEVO:               "Contacto nuevo",
  CONTACTADO:          "Contactado",
  CITA_AGENDADA:       "Cita agendada",
  PRESUPUESTO_ENVIADO: "Calificado",
  CONVERTIDO:          "Convertido",
  PERDIDO:             "Perdido",
}

export const LEAD_STATUS_COLORS: Record<LeadStatus, string> = {
  NUEVO:               "bg-blue-100 text-blue-700",
  CONTACTADO:          "bg-violet-100 text-violet-700",
  CITA_AGENDADA:       "bg-amber-100 text-amber-700",
  PRESUPUESTO_ENVIADO: "bg-teal-100 text-teal-700",
  CONVERTIDO:          "bg-emerald-100 text-emerald-700",
  PERDIDO:             "bg-red-100 text-red-700",
}

export const TREATMENT_LABELS: Record<DentalTreatment, string> = {
  ORTODONCIA: "Ortodoncia",
  IMPLANTES: "Implantes",
  BLANQUEAMIENTO: "Blanqueamiento",
  ENDODONCIA: "Endodoncia",
  LIMPIEZA: "Limpieza",
  CIRUGIA: "Cirugía",
  PROTESIS: "Prótesis",
  OTRO: "Otro",
}

export const CHANNEL_LABELS: Record<MarketingChannel, string> = {
  INSTAGRAM: "Instagram",
  FACEBOOK: "Facebook",
  WHATSAPP: "WhatsApp",
  GOOGLE: "Google",
  REFERIDO: "Referido",
  TIKTOK: "TikTok",
  OTRO: "Otro",
}

export const CHANNEL_ICONS: Record<MarketingChannel, LucideIcon> = {
  INSTAGRAM: AtSign,
  FACEBOOK: Share2,
  WHATSAPP: MessageCircle,
  GOOGLE: Globe,
  REFERIDO: Users,
  TIKTOK: Music,
  OTRO: HelpCircle,
}
