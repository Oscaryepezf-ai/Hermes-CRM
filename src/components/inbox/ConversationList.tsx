"use client"

import { useState, useEffect, useRef } from "react"
import { Search, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { fetchConversations } from "@/lib/actions/inbox"
import { ConversationItem } from "./ConversationItem"
import type { InboxConversationItem, InboxFilters } from "@/lib/inbox/conversations"

interface ConversationListProps {
  filters:         InboxFilters
  selectedId:      string | null
  onSelect:        (id: string) => void
  onFilterChange:  (f: InboxFilters) => void
}

function SkeletonRow() {
  return (
    <div className="px-3 py-3 flex gap-2.5 border-b border-line-subtle animate-pulse">
      <div className="w-9 h-9 rounded-full bg-inset flex-shrink-0" />
      <div className="flex-1 space-y-2 pt-0.5">
        <div className="h-3 bg-inset rounded w-3/4" />
        <div className="h-2.5 bg-inset rounded w-1/2" />
      </div>
    </div>
  )
}

export function ConversationList({ filters, selectedId, onSelect, onFilterChange }: ConversationListProps) {
  const [conversations, setConversations] = useState<InboxConversationItem[]>([])
  const [loading, setLoading]             = useState(true)
  const [search, setSearch]               = useState("")
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const filtersKey = JSON.stringify(filters)

  useEffect(() => {
    setLoading(true)
    fetchConversations(filters).then(res => {
      if (res.success) setConversations(res.conversations)
      setLoading(false)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtersKey])

  const handleSearch = (val: string) => {
    setSearch(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      onFilterChange({ ...filters, search: val || undefined })
    }, 300)
  }

  const FILTER_LABEL = filters.isRead === false
    ? "No leídos"
    : filters.channel
    ? filters.channel.charAt(0) + filters.channel.slice(1).toLowerCase()
    : filters.labelId
    ? "Etiqueta"
    : "Todos los chats"

  return (
    <div className="w-[320px] flex-shrink-0 border-r border-line-subtle bg-surface flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-3 py-3 border-b border-line-subtle space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-[13px] font-semibold text-ink-primary">{FILTER_LABEL}</h3>
          {Object.keys(filters).length > 0 && (
            <button
              onClick={() => { setSearch(""); onFilterChange({}) }}
              className="text-[11px] text-ink-tertiary hover:text-ink-secondary flex items-center gap-0.5"
            >
              <X className="w-3 h-3" /> Limpiar
            </button>
          )}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-tertiary" />
          <input
            value={search}
            onChange={e => handleSearch(e.target.value)}
            placeholder="Buscar conversaciones..."
            className={cn(
              "w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-line-soft bg-inset",
              "text-ink-primary placeholder:text-ink-tertiary",
              "focus:outline-none focus:border-brand-400 transition-ui"
            )}
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-ink-tertiary">
            <Search className="w-8 h-8 mb-2 opacity-30" />
            <p className="text-sm">Sin conversaciones</p>
          </div>
        ) : (
          conversations.map(conv => (
            <ConversationItem
              key={conv.id}
              conversation={conv}
              isSelected={conv.id === selectedId}
              onClick={() => onSelect(conv.id)}
            />
          ))
        )}
      </div>
    </div>
  )
}
