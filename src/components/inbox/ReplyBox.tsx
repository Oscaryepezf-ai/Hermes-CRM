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
    <div className="border-t border-line-subtle bg-surface">
      {/* Tabs */}
      <div className="flex border-b border-line-subtle">
        <TabButton active={tab === "reply"} onClick={() => setTab("reply")}>
          <Send className="w-3 h-3" /> Responder
        </TabButton>
        <TabButton active={tab === "note"} onClick={() => setTab("note")}>
          <StickyNote className="w-3 h-3" /> Nota interna
        </TabButton>
      </div>

      {/* Textarea */}
      <div className="px-4 pt-3 pb-2">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={e => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isNote ? "Escribe una nota interna..." : "Responder aquí..."}
          rows={3}
          className={cn(
            "w-full resize-none bg-transparent text-sm text-ink-primary placeholder:text-ink-tertiary",
            "focus:outline-none",
            isNote && "italic"
          )}
        />
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 pb-3">
        <p className="text-[10px] text-ink-tertiary">
          {isNote ? "Solo visible para el equipo" : `⌘↵ para enviar`}
        </p>
        <button
          onClick={handleSend}
          disabled={!canSend}
          className={cn(
            "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-ui",
            canSend
              ? isNote
                ? "bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-950/60 dark:text-amber-300"
                : "bg-brand-500 text-white hover:bg-brand-600"
              : "opacity-40 cursor-not-allowed bg-inset text-ink-tertiary"
          )}
        >
          {sending
            ? <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
            : isNote
            ? <><StickyNote className="w-3 h-3" /> Guardar nota</>
            : <><Send className="w-3 h-3" /> Enviar a {channelLabel}</>
          }
        </button>
      </div>
    </div>
  )
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 px-4 py-2 text-xs font-medium border-b-2 transition-ui",
        active
          ? "border-brand-500 text-brand-600 dark:text-brand-400"
          : "border-transparent text-ink-tertiary hover:text-ink-secondary"
      )}
    >
      {children}
    </button>
  )
}
