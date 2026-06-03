"use client"

import { useState } from "react"
import { MessageCircle } from "lucide-react"
import { InboxSidebar }     from "@/components/inbox/InboxSidebar"
import { ConversationList } from "@/components/inbox/ConversationList"
import { ConversationView } from "@/components/inbox/ConversationView"
import type { InboxFilters } from "@/lib/inbox/conversations"

export default function InboxPage() {
  const [filters, setFilters]           = useState<InboxFilters>({})
  const [selectedId, setSelectedId]     = useState<string | null>(null)

  return (
    <div className="-m-6 flex h-[calc(100vh-52px)] overflow-hidden bg-canvas">
      {/* Panel izquierdo */}
      <InboxSidebar
        filters={filters}
        onFilterChange={f => { setFilters(f); setSelectedId(null) }}
      />

      {/* Panel central */}
      <ConversationList
        filters={filters}
        selectedId={selectedId}
        onSelect={setSelectedId}
        onFilterChange={setFilters}
      />

      {/* Panel derecho */}
      {selectedId ? (
        <ConversationView
          key={selectedId}
          conversationId={selectedId}
        />
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center bg-canvas text-ink-tertiary gap-3">
          <MessageCircle className="w-12 h-12 opacity-20" />
          <p className="text-sm">Selecciona una conversación para ver los mensajes</p>
        </div>
      )}
    </div>
  )
}
