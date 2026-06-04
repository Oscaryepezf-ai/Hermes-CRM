"use client"

import { useState } from "react"
import { MessageCircle, ArrowLeft } from "lucide-react"
import { cn } from "@/lib/utils"
import { InboxSidebar }     from "@/components/inbox/InboxSidebar"
import { ConversationList } from "@/components/inbox/ConversationList"
import { ConversationView } from "@/components/inbox/ConversationView"
import type { InboxFilters } from "@/lib/inbox/conversations"

export default function InboxPage() {
  const [filters, setFilters]       = useState<InboxFilters>({})
  const [selectedId, setSelectedId] = useState<string | null>(null)

  return (
    <div className="-m-3 md:-m-6 flex h-[calc(100vh-52px)] overflow-hidden bg-canvas">

      {/* Panel izquierdo — oculto en móvil */}
      <div className="hidden md:block">
        <InboxSidebar
          filters={filters}
          onFilterChange={f => { setFilters(f); setSelectedId(null) }}
        />
      </div>

      {/* Panel central — ocupa todo en móvil si no hay conversación seleccionada */}
      <div className={cn(
        "flex-shrink-0 border-r border-line-subtle",
        selectedId ? "hidden md:block md:w-[320px]" : "flex-1 md:flex-none md:w-[320px]"
      )}>
        <ConversationList
          filters={filters}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onFilterChange={setFilters}
        />
      </div>

      {/* Panel derecho — ocupa todo en móvil cuando hay conversación */}
      {selectedId ? (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Botón volver en móvil */}
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
        <div className="hidden md:flex flex-1 flex-col items-center justify-center bg-canvas text-ink-tertiary gap-3">
          <MessageCircle className="w-12 h-12 opacity-20" />
          <p className="text-sm">Selecciona una conversación para ver los mensajes</p>
        </div>
      )}
    </div>
  )
}
