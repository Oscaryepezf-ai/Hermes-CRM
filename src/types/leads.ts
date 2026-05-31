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
  journeyState: JourneyState
  treatment: DentalTreatment
  channel: MarketingChannel
  assignedTo: { id: string; name: string; avatarUrl: string | null } | null
  lastContactAt: Date | null
  updatedAt: Date
  notes: string | null
  isAgentHandled: boolean
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
  NUEVO: "Nuevo",
  CONTACTADO: "Contactado",
  CITA_AGENDADA: "Cita agendada",
  PRESUPUESTO_ENVIADO: "Presupuesto enviado",
  CONVERTIDO: "Convertido",
  PERDIDO: "Perdido",
}

export const LEAD_STATUS_COLORS: Record<LeadStatus, string> = {
  NUEVO: "bg-slate-100 text-slate-700",
  CONTACTADO: "bg-blue-100 text-blue-700",
  CITA_AGENDADA: "bg-yellow-100 text-yellow-700",
  PRESUPUESTO_ENVIADO: "bg-purple-100 text-purple-700",
  CONVERTIDO: "bg-green-100 text-green-700",
  PERDIDO: "bg-red-100 text-red-700",
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
