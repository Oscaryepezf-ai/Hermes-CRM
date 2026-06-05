"use client"

import { useState, useEffect } from "react"
import { Inbox, Circle, Bell, MessageCircle, Camera, Globe, ChevronDown, ChevronRight, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { fetchInboxCounts, fetchClinicLabels, createInboxLabel } from "@/lib/actions/inbox"
import type { InboxFilters } from "@/lib/inbox/conversations"
import type { InboxStatus, MarketingChannel } from "@prisma/client"

const PREDEFINED_COLORS = [
  "#EF4444", "#F97316", "#EAB308", "#22C55E",
  "#3B82F6", "#8B5CF6", "#EC4899", "#14B8A6",
]

type Label = { id: string; name: string; color: string; emoji: string | null }

interface InboxSidebarProps {
  filters:        InboxFilters
  onFilterChange: (f: InboxFilters) => void
  initialCounts?: { total: number; unread: number; channels: Record<string, number> }
  initialLabels?: Label[]
}

export function InboxSidebar({ filters, onFilterChange, initialCounts, initialLabels }: InboxSidebarProps) {
  const [counts, setCounts]         = useState<{ total: number; unread: number; channels: Record<string, number> }>(
    initialCounts ?? { total: 0, unread: 0, channels: {} }
  )
  const [labels, setLabels]         = useState<Label[]>(initialLabels ?? [])
  const [labelsOpen, setLabelsOpen] = useState(true)
  const [channelsOpen, setChannelsOpen] = useState(true)
  const [creating, setCreating]     = useState(false)
  const [newName, setNewName]       = useState("")
  const [newColor, setNewColor]     = useState(PREDEFINED_COLORS[4])

  useEffect(() => {
    // Only fetch if not seeded with server-side data
    if (!initialCounts) fetchInboxCounts().then(r => { if (r.success) setCounts(r.data) })
    if (!initialLabels) fetchClinicLabels().then(r => { if (r.success) setLabels(r.data) })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleCreateLabel = async () => {
    if (!newName.trim()) return
    const res = await createInboxLabel({ name: newName.trim(), color: newColor })
    if (res.success) {
      setLabels(prev => [...prev, res.data])
      setNewName("")
      setCreating(false)
    }
  }

  const isActive = (f: InboxFilters) => {
    return JSON.stringify(filters) === JSON.stringify(f)
  }

  const MAIN_FILTERS: { label: string; icon: React.ReactNode; f: InboxFilters; dot?: boolean }[] = [
    {
      label: "Todos los chats",
      icon:  <Inbox className="w-3.5 h-3.5" />,
      f:     {},
    },
    {
      label: "No leídos",
      icon:  <Circle className="w-3.5 h-3.5 fill-brand-500 text-brand-500" />,
      f:     { isRead: false },
      dot:   counts.unread > 0,
    },
  ]

  const CHANNEL_ITEMS: { channel: MarketingChannel; icon: React.ReactNode; label: string }[] = [
    { channel: "WHATSAPP",  icon: <MessageCircle className="w-3.5 h-3.5" style={{ color: "#25D366" }} />, label: "WhatsApp"  },
    { channel: "INSTAGRAM", icon: <Camera        className="w-3.5 h-3.5" style={{ color: "#E1306C" }} />, label: "Instagram" },
    { channel: "FACEBOOK",  icon: <Globe         className="w-3.5 h-3.5" style={{ color: "#1877F2" }} />, label: "Facebook"  },
  ]

  return (
    <aside className="w-[220px] flex-shrink-0 bg-surface border-r border-line-subtle flex flex-col overflow-y-auto scrollbar-thin">
      {/* Header */}
      <div className="px-4 py-3 border-b border-line-subtle">
        <h2 className="text-[13px] font-semibold text-ink-primary">Bandeja de entrada</h2>
      </div>

      <div className="flex-1 px-2 py-2 space-y-0.5">
        {/* Main filters */}
        {MAIN_FILTERS.map(item => (
          <button
            key={JSON.stringify(item.f)}
            onClick={() => onFilterChange(item.f)}
            className={cn(
              "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-ui",
              isActive(item.f)
                ? "bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400"
                : "text-ink-secondary hover:bg-inset hover:text-ink-primary"
            )}
          >
            {item.icon}
            <span className="flex-1 text-left text-[13px]">{item.label}</span>
            {item.dot && (
              <span className="text-[10px] font-semibold bg-brand-500 text-white rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">
                {counts.unread}
              </span>
            )}
            {!item.dot && item.f.isRead === undefined && counts.total > 0 && (
              <span className="text-[10px] text-ink-tertiary">{counts.total}</span>
            )}
          </button>
        ))}

        {/* Labels */}
        <div className="pt-2">
          <button
            onClick={() => setLabelsOpen(o => !o)}
            className="w-full flex items-center gap-1 px-3 py-1.5 text-[11px] font-semibold text-ink-tertiary uppercase tracking-wide hover:text-ink-secondary transition-ui"
          >
            {labelsOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            <span className="flex-1 text-left">Etiquetas</span>
            <button
              onClick={e => { e.stopPropagation(); setCreating(c => !c) }}
              className="w-4 h-4 flex items-center justify-center rounded hover:bg-inset transition-ui"
              title="Nueva etiqueta"
            >
              <Plus className="w-3 h-3" />
            </button>
          </button>

          {labelsOpen && (
            <div className="space-y-0.5 mt-1">
              {labels.map(label => (
                <button
                  key={label.id}
                  onClick={() => onFilterChange({ labelId: label.id })}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-ui",
                    filters.labelId === label.id
                      ? "bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400"
                      : "text-ink-secondary hover:bg-inset hover:text-ink-primary"
                  )}
                >
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: label.color }} />
                  <span className="flex-1 text-left text-[13px] truncate">
                    {label.emoji && <span className="mr-1">{label.emoji}</span>}
                    {label.name}
                  </span>
                </button>
              ))}

              {creating && (
                <div className="px-3 py-2 space-y-2">
                  <input
                    autoFocus
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleCreateLabel(); if (e.key === 'Escape') setCreating(false) }}
                    placeholder="Nombre de etiqueta"
                    className="w-full text-xs px-2 py-1.5 rounded-md border border-line-soft bg-inset text-ink-primary placeholder:text-ink-tertiary focus:outline-none focus:border-brand-400"
                  />
                  <div className="flex gap-1 flex-wrap">
                    {PREDEFINED_COLORS.map(c => (
                      <button
                        key={c}
                        onClick={() => setNewColor(c)}
                        className={cn("w-4 h-4 rounded-full border-2", newColor === c ? "border-ink-primary" : "border-transparent")}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={handleCreateLabel}
                      className="flex-1 text-[11px] bg-brand-500 text-white rounded-md py-1 hover:bg-brand-600 transition-ui"
                    >
                      Crear
                    </button>
                    <button
                      onClick={() => setCreating(false)}
                      className="flex-1 text-[11px] bg-inset text-ink-secondary rounded-md py-1 hover:bg-line-subtle transition-ui"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Channels */}
        <div className="pt-2">
          <button
            onClick={() => setChannelsOpen(o => !o)}
            className="w-full flex items-center gap-1 px-3 py-1.5 text-[11px] font-semibold text-ink-tertiary uppercase tracking-wide hover:text-ink-secondary transition-ui"
          >
            {channelsOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            <span className="flex-1 text-left">Canales</span>
          </button>

          {channelsOpen && (
            <div className="space-y-0.5 mt-1">
              {CHANNEL_ITEMS.map(item => (
                <button
                  key={item.channel}
                  onClick={() => onFilterChange({ channel: item.channel })}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-ui",
                    filters.channel === item.channel
                      ? "bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400"
                      : "text-ink-secondary hover:bg-inset hover:text-ink-primary"
                  )}
                >
                  {item.icon}
                  <span className="flex-1 text-left text-[13px]">{item.label}</span>
                  {counts.channels[item.channel] != null && (
                    <span className="text-[10px] text-ink-tertiary">{counts.channels[item.channel]}</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}
