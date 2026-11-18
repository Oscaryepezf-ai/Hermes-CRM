"use client"

import { useState, useRef } from "react"
import { Send, StickyNote } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { replyToConversation } from "@/lib/actions/inbox"
import { getChannelLabel } from "./ChannelIcon"
import type { MarketingChannel } from "@prisma/client"

interface ReplyBoxProps {
  conversationId: string
  channel:        MarketingChannel
  onMessageSent?: (content: string, isNote: boolean) => void
}

type Tab = "reply" | "note"

export function ReplyBox({ conversationId, channel, onMessageSent }: ReplyBoxProps) {
  const [tab, setTab]         = useState<Tab>("reply")
  const [content, setContent] = useState("")
  const [sending, setSending] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const channelLabel = getChannelLabel(channel)
  const isNote       = tab === "note"
  const canSend      = content.trim().length > 0 && !sending

  const handleSend = async () => {
    if (!canSend) return
    setSending(true)
    try {
      const res = await replyToConversation({ conversationId, content: content.trim(), type: tab })
      if (!res.success) {
        toast.error((res as { error: string }).error ?? "Error al enviar")
        return
      }
      onMessageSent?.(content.trim(), isNote)
      setContent("")
      textareaRef.current?.focus()
    } catch {
      toast.error("Error inesperado al enviar")
    } finally {
      setSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="bg-surface px-4 pb-4 pt-3 border-t border-line-subtle">
      {/* Tabs (segmentado) */}
      <div className="inline-flex items-center gap-1 bg-inset rounded-full p-1 mb-3" role="tablist">
        <TabButton active={tab === "reply"} onClick={() => setTab("reply")}>
          <Send className="w-3.5 h-3.5" /> Responder
        </TabButton>
        <TabButton active={tab === "note"} onClick={() => setTab("note")}>
          <StickyNote className="w-3.5 h-3.5" /> Nota interna
        </TabButton>
      </div>

      {/* Caja de texto */}
      <div className={cn(
        "rounded-2xl px-4 pt-3 pb-2 transition-ui",
        isNote ? "bg-amber-50 dark:bg-amber-950/30" : "bg-inset"
      )}>
        <textarea
          ref={textareaRef}
          value={content}
          onChange={e => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isNote ? "Escribe una nota interna..." : "Responder aquí..."}
          rows={3}
          className={cn(
            "w-full resize-none bg-transparent text-[14px] text-ink-primary placeholder:text-ink-tertiary",
            "focus:outline-none",
            isNote && "italic"
          )}
        />

        {/* Toolbar */}
        <div className="flex items-center justify-between pt-1">
          <p className="text-xs text-ink-tertiary">
            {isNote ? "Solo visible para el equipo" : "⌘↵ para enviar"}
          </p>
          <button
            onClick={handleSend}
            disabled={!canSend}
            className={cn(
              "inline-flex items-center gap-1.5 h-9 px-4 rounded-full text-[13px] font-semibold transition-ui",
              canSend
                ? isNote
                  ? "bg-amber-100 text-amber-800 hover:bg-amber-200 dark:bg-amber-950/60 dark:text-amber-300"
                  : "bg-brand-gradient text-white hover:opacity-95"
                : "opacity-50 cursor-not-allowed bg-surface text-ink-tertiary"
            )}
            style={canSend && !isNote ? { boxShadow: "var(--shadow-brand)" } : undefined}
          >
            {sending
              ? <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
              : isNote
              ? <><StickyNote className="w-3.5 h-3.5" /> Guardar nota</>
              : <><Send className="w-3.5 h-3.5" /> Enviar a {channelLabel}</>
            }
          </button>
        </div>
      </div>
    </div>
  )
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 h-8 px-3.5 rounded-full text-[13px] font-medium transition-ui",
        active
          ? "bg-surface text-brand-600 shadow-card"
          : "text-ink-tertiary hover:text-ink-secondary"
      )}
    >
      {children}
    </button>
  )
}
