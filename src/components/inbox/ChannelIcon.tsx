import { MessageCircle, Camera, Globe, Search, Users, HelpCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import type { MarketingChannel } from "@prisma/client"

const CHANNEL_CONFIG: Record<string, {
  label: string
  Icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>
  bg: string
  color: string
}> = {
  WHATSAPP:  { label: "WhatsApp",  Icon: MessageCircle, bg: "#F0FDF4", color: "#25D366" },
  INSTAGRAM: { label: "Instagram", Icon: Camera,        bg: "#FDF2F8", color: "#E1306C" },
  FACEBOOK:  { label: "Facebook",  Icon: Globe,         bg: "#EFF6FF", color: "#1877F2" },
  GOOGLE:    { label: "Google",    Icon: Search,        bg: "#EFF6FF", color: "#4285F4" },
  REFERIDO:  { label: "Referido",  Icon: Users,         bg: "#F5F3FF", color: "#8B7CF6" },
  TIKTOK:    { label: "TikTok",    Icon: MessageCircle, bg: "#F5F5F5", color: "#010101" },
  OTRO:      { label: "Otro",      Icon: HelpCircle,    bg: "#F0F2F6", color: "#94A3B8" },
}

const SIZES = { sm: "w-4 h-4", md: "w-5 h-5", lg: "w-7 h-7" }
const ICON_SIZES = { sm: "w-2.5 h-2.5", md: "w-3 h-3", lg: "w-4 h-4" }

interface ChannelIconProps {
  channel: MarketingChannel | string
  size?: "sm" | "md" | "lg"
  className?: string
  showLabel?: boolean
}

export function ChannelIcon({ channel, size = "md", className, showLabel = false }: ChannelIconProps) {
  const cfg = CHANNEL_CONFIG[channel] ?? CHANNEL_CONFIG.OTRO
  const { Icon, bg, color, label } = cfg

  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <span
        className={cn("rounded-full flex items-center justify-center flex-shrink-0", SIZES[size])}
        style={{ background: bg }}
      >
        <Icon className={ICON_SIZES[size]} style={{ color }} />
      </span>
      {showLabel && <span className="text-xs text-ink-tertiary">{label}</span>}
    </span>
  )
}

export function getChannelLabel(channel: string): string {
  return CHANNEL_CONFIG[channel]?.label ?? channel
}

export function getChannelColor(channel: string): string {
  return CHANNEL_CONFIG[channel]?.color ?? "#94A3B8"
}
