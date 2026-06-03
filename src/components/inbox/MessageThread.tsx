"use client"

import { useEffect, useRef } from "react"
import { format, isToday, isYesterday, isSameDay } from "date-fns"
import { es } from "date-fns/locale"
import { Check, CheckCheck } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Message } from "@prisma/client"

interface MessageThreadProps {
  messages: Message[]
}

function formatDayLabel(date: Date): string {
  if (isToday(date))     return "Hoy"
  if (isYesterday(date)) return "Ayer"
  return format(date, "EEEE, d 'de' MMMM", { locale: es })
}

function StatusIcon({ status }: { status: string }) {
  if (status === "READ")      return <CheckCheck className="w-3 h-3 text-blue-400" />
  if (status === "DELIVERED") return <CheckCheck className="w-3 h-3 text-ink-disabled" />
  return <Check className="w-3 h-3 text-ink-disabled" />
}

export function MessageThread({ messages }: MessageThreadProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages.length])

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#F0F2F5] dark:bg-[#0D0F14] text-ink-tertiary text-sm">
        Sin mensajes todavía
      </div>
    )
  }

  const grouped: { date: Date; msgs: Message[] }[] = []
  for (const msg of messages) {
    const d = new Date(msg.sentAt)
    const last = grouped[grouped.length - 1]
    if (!last || !isSameDay(last.date, d)) {
      grouped.push({ date: d, msgs: [msg] })
    } else {
      last.msgs.push(msg)
    }
  }

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin bg-[#F0F2F5] dark:bg-[#0D0F14] p-4 space-y-1">
      {grouped.map((group, gi) => (
        <div key={gi}>
          {/* Day separator */}
          <div className="flex justify-center my-3">
            <span className="bg-white/80 dark:bg-white/10 rounded-full px-3 py-1 text-xs text-ink-tertiary">
              {formatDayLabel(group.date)}
            </span>
          </div>

          {group.msgs.map(msg => {
            const isOut  = msg.direction === "OUTBOUND"
            const isNote = msg.isNote

            if (isNote) {
              return (
                <div key={msg.id} className="flex justify-center my-1">
                  <div className="max-w-[85%] bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl px-3 py-2">
                    <p className="text-[10px] font-medium text-amber-600 dark:text-amber-400 mb-1">
                      Nota interna
                    </p>
                    <p className="text-sm text-amber-900 dark:text-amber-200 italic">{msg.content}</p>
                    <p className="text-[10px] text-amber-500 text-right mt-1">
                      {format(new Date(msg.sentAt), "HH:mm")}
                    </p>
                  </div>
                </div>
              )
            }

            return (
              <div
                key={msg.id}
                className={cn(
                  "flex mb-1",
                  isOut ? "justify-end" : "justify-start"
                )}
              >
                <div
                  className={cn(
                    "max-w-[75%] px-3 py-2 rounded-2xl",
                    isOut
                      ? "bg-brand-500 text-white rounded-tr-none"
                      : "bg-white dark:bg-[#1E2730] text-ink-primary rounded-tl-none shadow-sm"
                  )}
                >
                  <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                  <div className={cn(
                    "flex items-center gap-1 mt-1",
                    isOut ? "justify-end" : "justify-start"
                  )}>
                    <span className={cn(
                      "text-[10px]",
                      isOut ? "text-white/70" : "text-ink-disabled"
                    )}>
                      {format(new Date(msg.sentAt), "HH:mm")}
                    </span>
                    {isOut && <StatusIcon status={msg.status} />}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  )
}
