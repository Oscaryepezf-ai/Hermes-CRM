import { MessageCircle, Camera, Globe, Search, Users, Music, HelpCircle } from 'lucide-react'
import type { MarketingChannel } from '@prisma/client'

const CHANNEL_CONFIG: Record<MarketingChannel, {
  label:     string
  dot:       string
  textColor: string
  bgColor:   string
  icon:      React.ElementType
}> = {
  FACEBOOK:  { label: 'Facebook',  dot: '#1877F2', textColor: '#0D5DBB', bgColor: '#EFF6FF', icon: Globe },
  INSTAGRAM: { label: 'Instagram', dot: '#E1306C', textColor: '#C2185B', bgColor: '#FDF2F8', icon: Camera },
  WHATSAPP:  { label: 'WhatsApp',  dot: '#25D366', textColor: '#128C4A', bgColor: '#F0FDF4', icon: MessageCircle },
  GOOGLE:    { label: 'Google',    dot: '#4285F4', textColor: '#1A56C9', bgColor: '#EFF6FF', icon: Search },
  REFERIDO:  { label: 'Referido',  dot: '#8B7CF6', textColor: '#6248C4', bgColor: '#F5F3FF', icon: Users },
  TIKTOK:    { label: 'TikTok',    dot: '#010101', textColor: '#1A1A1A', bgColor: '#F5F5F5', icon: Music },
  OTRO:      { label: 'Otro',      dot: '#94A3B8', textColor: '#4A5568', bgColor: '#F0F2F6', icon: HelpCircle },
}

interface ChannelBadgeProps {
  channel:   MarketingChannel
  size?:     'xs' | 'sm'
  showIcon?: boolean
}

export function ChannelBadge({ channel, size = 'xs', showIcon = false }: ChannelBadgeProps) {
  const cfg  = CHANNEL_CONFIG[channel]
  const Icon = cfg.icon

  return (
    <span
      className="inline-flex items-center gap-[5px] font-medium rounded-full"
      style={{
        fontSize:        size === 'xs' ? '10px' : '11px',
        padding:         size === 'xs' ? '1px 6px' : '2px 8px',
        backgroundColor: cfg.bgColor,
        color:           cfg.textColor,
      }}
    >
      <span
        className="rounded-full flex-shrink-0"
        style={{
          width:           size === 'xs' ? '5px' : '6px',
          height:          size === 'xs' ? '5px' : '6px',
          backgroundColor: cfg.dot,
        }}
      />
      {showIcon && <Icon style={{ width: '11px', height: '11px' }} className="flex-shrink-0" />}
      {cfg.label}
    </span>
  )
}
