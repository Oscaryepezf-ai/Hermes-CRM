"use client"

import { useState } from "react"
import { CheckCircle, Tag, ExternalLink, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { updateConversationStatus, assignConversation, addLabelToConversation } from "@/lib/actions/inbox"
import { ChannelIcon } from "./ChannelIcon"
import { LabelBadge } from "./LabelBadge"
import type { InboxConversationItem } from "@/lib/inbox/conversations"

interface ConversationHeaderProps {
  conversation: InboxConversationItem & {
    lead: { id: string; fullName: string; phone: string; treatment: string | null }
  }
  labels:   { id: string; name: string; color: string; emoji: string | null }[]
  users:    { id: string; name: string; avatarUrl: string | null }[]
  onReload: () => void
}

function getInitials(name: string) {
  return name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()
}

export function ConversationHeader({ conversation: conv, labels, users, onReload }: ConversationHeaderProps) {
  const [assignOpen, setAssignOpen]   = useState(false)
  const [labelOpen, setLabelOpen]     = useState(false)
  const [resolving, setResolving]     = useState(false)

  const handleResolve = async () => {
    setResolving(true)
    const res = await updateConversationStatus(conv.id, "RESOLVED")
    if (!res.success) toast.error("Error al resolver")
    else { toast.success("Conversación resuelta"); onReload() }
    setResolving(false)
  }

  const handleAssign = async (userId: string | null) => {
    const res = await assignConversation(conv.id, userId)
    if (!res.success) toast.error("Error al asignar")
    else onReload()
    setAssignOpen(false)
  }

  const handleAddLabel = async (labelId: string) => {
    const res = await addLabelToConversation(conv.id, labelId)
    if (!res.success) toast.error("Error al etiquetar")
    else onReload()
    setLabelOpen(false)
  }

  const assignedUser = users.find(u => u.id === conv.assignedToId)

  return (
    <div className="h-14 px-4 flex items-center gap-3 border-b border-line-subtle bg-surface flex-shrink-0">
      {/* Lead avatar + info */}
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 text-[11px] font-semibold flex-shrink-0">
          {getInitials(conv.lead.fullName)}
        </div>
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-ink-primary truncate">{conv.lead.fullName}</p>
          <div className="relative">
            <button
              onClick={() => setAssignOpen(o => !o)}
              className="flex items-center gap-0.5 text-[11px] text-ink-tertiary hover:text-ink-secondary transition-ui"
            >
              {assignedUser ? assignedUser.name : "Sin asignar"}
              <ChevronDown className="w-3 h-3" />
            </button>
            {assignOpen && (
              <div className="absolute top-full left-0 z-50 mt-1 w-44 bg-surface border border-line-soft rounded-lg shadow-card overflow-hidden">
                <button
                  onClick={() => handleAssign(null)}
                  className="w-full px-3 py-2 text-left text-xs text-ink-tertiary hover:bg-inset"
                >
                  Sin asignar
                </button>
                {users.map(u => (
                  <button
                    key={u.id}
                    onClick={() => handleAssign(u.id)}
                    className="w-full px-3 py-2 text-left text-xs text-ink-primary hover:bg-inset truncate"
                  >
                    {u.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Channel icon */}
      <ChannelIcon channel={conv.channel} size="lg" />

      {/* Labels display */}
      {conv.labels.length > 0 && (
        <div className="hidden md:flex items-center gap-1">
          {conv.labels.slice(0, 2).map(l => (
            <LabelBadge key={l.id} name={l.name} color={l.color} emoji={l.emoji} />
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {/* Label button */}
        <div className="relative">
          <button
            onClick={() => setLabelOpen(o => !o)}
            title="Etiquetar"
            className="w-8 h-8 rounded-full flex items-center justify-center text-ink-tertiary hover:bg-inset transition-ui"
          >
            <Tag className="w-4 h-4" />
          </button>
          {labelOpen && (
            <div className="absolute top-full right-0 z-50 mt-1 w-44 bg-surface border border-line-soft rounded-lg shadow-card overflow-hidden">
              {labels.length === 0 ? (
                <p className="px-3 py-2 text-xs text-ink-tertiary">Sin etiquetas</p>
              ) : (
                labels.map(l => (
                  <button
                    key={l.id}
                    onClick={() => handleAddLabel(l.id)}
                    className={cn(
                      "w-full px-3 py-2 text-left text-xs hover:bg-inset flex items-center gap-2",
                      conv.labels.some(cl => cl.id === l.id) ? "text-brand-600" : "text-ink-primary"
                    )}
                  >
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: l.color }} />
                    {l.emoji && <span>{l.emoji}</span>}
                    {l.name}
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* View lead */}
        <a
          href={`/pipeline`}
          title="Ver en pipeline"
          className="w-8 h-8 rounded-full flex items-center justify-center text-ink-tertiary hover:bg-inset transition-ui"
        >
          <ExternalLink className="w-4 h-4" />
        </a>

        {/* Resolve */}
        {conv.status !== "RESOLVED" && (
          <button
            onClick={handleResolve}
            disabled={resolving}
            title="Resolver conversación"
            className="w-8 h-8 rounded-full flex items-center justify-center text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-ui disabled:opacity-50"
          >
            {resolving
              ? <span className="w-3.5 h-3.5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
              : <CheckCircle className="w-4 h-4" />
            }
          </button>
        )}
      </div>
    </div>
  )
}
