import { ROLE_LABELS, ROLE_COLORS, ROLE_ICONS } from '@/types/rbac'
import type { UserRole } from '@prisma/client'
import { ShieldCheck, Stethoscope, Headset } from 'lucide-react'

const ICONS = { ShieldCheck, Stethoscope, Headset }

type RoleBadgeProps = {
  role: UserRole
  size?: 'sm' | 'md'
  showIcon?: boolean
}

export function RoleBadge({ role, size = 'md', showIcon = true }: RoleBadgeProps) {
  const { bg, text, border } = ROLE_COLORS[role]
  const label = ROLE_LABELS[role]
  const IconName = ROLE_ICONS[role]
  const Icon = ICONS[IconName]

  return (
    <span
      className={`
        inline-flex items-center gap-1.5 font-medium border rounded-full
        ${bg} ${text} ${border}
        ${size === 'sm' ? 'text-[11px] px-2 py-0.5' : 'text-xs px-2.5 py-1'}
      `}
    >
      {showIcon && <Icon className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />}
      {label}
    </span>
  )
}
