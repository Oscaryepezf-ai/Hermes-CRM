"use client"

import { formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { ChannelIcon } from "./ChannelIcon"
import { LabelBadge } from "./LabelBadge"
import type { InboxConversationItem } from "@/lib/inbox/conversations"

interface ConversationItemProps {
  conversation: InboxConversationItem
  isSelected:   boolean
  onClick:      () => void
}

function getInitialsBg(name: string): string {
  const colors = [
    "#6366F1","#8B5CF6","#EC4899","#EF4444",
    "#F97316","#EAB308","#22C55E","#14B8A6","#3B82F6",
  ]
  const i = name.charCodeAt(0) % colors.length
  return colors[i]
}

function getInitials(name: string): string {
  return name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()
}

export function ConversationItem({ conversation: c, isSelected, onClick }: ConversationItemProps) {
  const { lead, assignedTo, labels, isRead, unreadCount, lastMessageAt, lastMessagePreview, channel } = c

  const visibleLabels = labels.slice(0, 2)
  const extraLabels   = labels.length - 2

  const timeStr = lastMessageAt
    ? formatDistanceToNow(new Date(lastMessageAt), { addSuffix: false, locale: es })
    : ""

  return (
    <button
      onClick={onClick}
      aria-current={isSelected ? "true" : undefined}
      className={cn(
        "w-full text-left px-3 py-3 flex gap-3 rounded-2xl transition-colors duration-150",
        isSelected
          ? "bg-brand-50 dark:bg-brand-900/20"
          : "hover:bg-inset"
      )}
    >
      {/* Avatar */}
      <div
        className="w-11 h-11 rounded-full flex-shrink-0 flex items-center justify-center text-white text-sm font-semibold"
        style={{ backgroundColor: getInitialsBg(lead.fullName) }}
      >
        {getInitials(lead.fullName)}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Row 1: name + channel + time */}
        <div className="flex items-center gap-1 justify-between">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className={cn(
              "text-[14px] truncate text-ink-primary",
              !isRead ? "font-semibold" : "font-medium"
            )}>
              {lead.fullName}
            </span>
            <ChannelIcon channel={channel} size="sm" />
          </div>
          {timeStr && (
            <span className={cn(
              "text-xs whitespace-nowrap flex-shrink-0 ml-1",
              !isRead ? "text-brand-600 font-medium" : "text-ink-tertiary"
            )}>
              {timeStr}
            </span>
          )}
        </div>

        {/* Row 2: preview + unread badge */}
        <div className="flex items-center justify-between gap-2 mt-0.5">
          <p className={cn(
            "text-[13px] line-clamp-1",
            !isRead ? "text-ink-primary" : "text-ink-tertiary"
          )}>
            {lastMessagePreview ?? "Sin mensajes"}
          </p>
          {!isRead && unreadCount > 0 && (
            <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-brand-500 text-white text-[11px] font-semibold flex items-center justify-center flex-shrink-0 tabular-nums">
              {unreadCount}
            </span>
          )}
        </div>

        {/* Row 3: labels */}
        {visibleLabels.length > 0 && (
          <div className="flex items-center gap-1 mt-1.5">
            {visibleLabels.map(l => (
              <LabelBadge key={l.id} name={l.name} color={l.color} emoji={l.emoji} />
            ))}
            {extraLabels > 0 && (
              <span className="text-xs text-ink-tertiary">+{extraLabels}</span>
            )}
          </div>
        )}
      </div>
    </button>
  )
}
