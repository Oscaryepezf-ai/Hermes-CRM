"use client"

import { useState } from "react"
import { MessageCircle, ArrowLeft } from "lucide-react"
import { cn } from "@/lib/utils"
import { InboxSidebar }     from "./InboxSidebar"
import { ConversationList } from "./ConversationList"
import { ConversationView } from "./ConversationView"
import type { InboxConversationItem, InboxFilters } from "@/lib/inbox/conversations"

type Counts = { total: number; unread: number; channels: Record<string, number> }
type Label  = { id: string; name: string; color: string; emoji: string | null }

interface InboxClientProps {
  initialConversations:      InboxConversationItem[]
  initialCounts:             Counts
  initialLabels:             Label[]
  initialOpenConversationId?: string | null
}

export function InboxClient({ initialConversations, initialCounts, initialLabels, initialOpenConversationId }: InboxClientProps) {
  const [filters, setFilters]       = useState<InboxFilters>({})
  const [selectedId, setSelectedId] = useState<string | null>(initialOpenConversationId ?? null)

  return (
    <div className="-m-3 md:-m-6 flex gap-3 p-3 md:p-4 h-[calc(100vh-64px)] overflow-hidden bg-canvas">

      {/* Panel izquierdo — oculto en móvil */}
      <div className="hidden md:block">
        <InboxSidebar
          filters={filters}
          onFilterChange={f => { setFilters(f); setSelectedId(null) }}
          initialCounts={initialCounts}
          initialLabels={initialLabels}
        />
      </div>

      {/* Panel central */}
      <div className={cn(
        "flex-shrink-0 rounded-2xl overflow-hidden shadow-card",
        selectedId ? "hidden md:block md:w-[320px]" : "flex-1 md:flex-none md:w-[320px]"
      )}>
        <ConversationList
          filters={filters}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onFilterChange={setFilters}
          initialConversations={initialConversations}
        />
      </div>

      {/* Panel derecho */}
      {selectedId ? (
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden rounded-2xl shadow-card bg-surface">
          <button
            onClick={() => setSelectedId(null)}
            className="md:hidden flex items-center gap-2 px-4 py-2.5 text-sm text-brand-600 font-medium border-b border-line-subtle bg-surface flex-shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver a conversaciones
          </button>
          <ConversationView key={selectedId} conversationId={selectedId} />
        </div>
      ) : (
        <div className="hidden md:flex flex-1 flex-col items-center justify-center rounded-2xl bg-surface shadow-card text-ink-tertiary gap-4">
          <div className="w-16 h-16 rounded-2xl bg-brand-50 flex items-center justify-center">
            <MessageCircle className="w-8 h-8 text-brand-500" />
          </div>
          <div className="text-center">
            <p className="text-[15px] font-semibold text-ink-primary">Tus conversaciones</p>
            <p className="text-sm mt-1">Selecciona una para ver los mensajes</p>
          </div>
        </div>
      )}
    </div>
  )
}
