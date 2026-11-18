"use client"

import { useState, useEffect, useRef } from "react"
import { Search, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { fetchConversations } from "@/lib/actions/inbox"
import { ConversationItem } from "./ConversationItem"
import type { InboxConversationItem, InboxFilters } from "@/lib/inbox/conversations"

interface ConversationListProps {
  filters:               InboxFilters
  selectedId:            string | null
  onSelect:              (id: string) => void
  onFilterChange:        (f: InboxFilters) => void
  initialConversations?: InboxConversationItem[]
}

function SkeletonRow() {
  return (
    <div className="px-3 py-3 flex gap-3 animate-pulse">
      <div className="w-11 h-11 rounded-full bg-inset flex-shrink-0" />
      <div className="flex-1 space-y-2 pt-0.5">
        <div className="h-3 bg-inset rounded w-3/4" />
        <div className="h-2.5 bg-inset rounded w-1/2" />
      </div>
    </div>
  )
}

export function ConversationList({ filters, selectedId, onSelect, onFilterChange, initialConversations }: ConversationListProps) {
  const [conversations, setConversations] = useState<InboxConversationItem[]>(initialConversations ?? [])
  const [loading, setLoading]             = useState(false)
  const [search, setSearch]               = useState("")
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isFirstRender = useRef(true)

  const filtersKey = JSON.stringify(filters)

  useEffect(() => {
    // Skip the very first render if we already have server-side data
    if (isFirstRender.current && initialConversations) {
      isFirstRender.current = false
      return
    }
    isFirstRender.current = false

    setLoading(true)
    fetchConversations(filters).then(res => {
      if (res.success) setConversations(res.conversations)
      setLoading(false)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtersKey])

  // Silent polling — refresh list every 10s to show new incoming conversations
  useEffect(() => {
    const interval = setInterval(() => {
      fetchConversations(filters).then(res => {
        if (res.success) setConversations(res.conversations)
      })
    }, 20000)
    return () => clearInterval(interval)
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
    <div className="w-full md:w-[320px] flex-shrink-0 bg-surface flex flex-col overflow-hidden h-full">
      {/* Header */}
      <div className="px-4 pt-5 pb-3 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-[17px] font-bold text-ink-primary tracking-tight">{FILTER_LABEL}</h3>
          {Object.keys(filters).length > 0 && (
            <button
              onClick={() => { setSearch(""); onFilterChange({}) }}
              className="text-xs text-ink-tertiary hover:text-ink-secondary flex items-center gap-0.5"
            >
              <X className="w-3 h-3" /> Limpiar
            </button>
          )}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-tertiary" />
          <input
            value={search}
            onChange={e => handleSearch(e.target.value)}
            placeholder="Buscar conversaciones..."
            className={cn(
              "w-full pl-10 pr-4 h-10 text-[13px] rounded-full bg-inset",
              "text-ink-primary placeholder:text-ink-tertiary",
              "focus:outline-none focus:ring-2 focus:ring-brand-400/50 transition-ui"
            )}
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto scrollbar-thin px-2 pb-2">
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
