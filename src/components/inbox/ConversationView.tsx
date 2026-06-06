"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { fetchConversationDetail, fetchClinicLabels, fetchClinicUsers } from "@/lib/actions/inbox"
import { ConversationHeader } from "./ConversationHeader"
import { MessageThread } from "./MessageThread"
import { ReplyBox } from "./ReplyBox"
import type { InboxConversationItem } from "@/lib/inbox/conversations"
import type { Message } from "@prisma/client"

interface ConversationViewProps {
  conversationId: string
}

type Label = { id: string; name: string; color: string; emoji: string | null }
type User  = { id: string; name: string; avatarUrl: string | null }

export function ConversationView({ conversationId }: ConversationViewProps) {
  const [conv, setConv]         = useState<(InboxConversationItem & { lead: { id: string; fullName: string; phone: string; treatment: string | null } }) | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [labels, setLabels]     = useState<Label[]>([])
  const [users, setUsers]       = useState<User[]>([])
  const [loading, setLoading]   = useState(true)
  const pollingRef              = useRef<ReturnType<typeof setInterval> | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const [detailRes, labelsRes, usersRes] = await Promise.all([
      fetchConversationDetail(conversationId),
      fetchClinicLabels(),
      fetchClinicUsers(),
    ])
    if (detailRes.success) {
      setConv(detailRes.conversation as any)
      setMessages(detailRes.messages)
    }
    if (labelsRes.success) setLabels(labelsRes.data)
    if (usersRes.success)  setUsers(usersRes.data)
    setLoading(false)
  }, [conversationId])

  const silentPoll = useCallback(async () => {
    const res = await fetchConversationDetail(conversationId)
    if (res.success) {
      setConv(res.conversation as any)
      setMessages(prev => {
        const incoming = res.messages
        if (incoming.length !== prev.length) return incoming
        return prev
      })
    }
  }, [conversationId])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    pollingRef.current = setInterval(silentPoll, 4000)
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current)
    }
  }, [silentPoll])

  const handleMessageSent = (content: string, isNote: boolean) => {
    const optimistic = {
      id:                `temp-${Date.now()}`,
      leadId:            conv?.leadId ?? "",
      direction:         "OUTBOUND" as const,
      content,
      mediaUrl:          null,
      status:            "SENT" as const,
      sentAt:            new Date(),
      deliveredAt:       null,
      readAt:            null,
      channel:           (conv?.channel ?? "WHATSAPP") as Message["channel"],
      externalMessageId: null,
      isAutomatic:       false,
      isNote,
    } satisfies Message
    setMessages(prev => [...prev, optimistic])
  }

  if (loading) {
    return (
      <div className="flex-1 flex flex-col bg-surface">
        <div className="h-14 border-b border-line-subtle bg-surface animate-pulse" />
        <div className="flex-1 bg-[#F0F2F5] dark:bg-[#0D0F14]" />
        <div className="h-36 border-t border-line-subtle bg-surface" />
      </div>
    )
  }

  if (!conv) {
    return (
      <div className="flex-1 flex items-center justify-center bg-canvas text-ink-tertiary text-sm">
        Conversación no encontrada
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-surface">
      <ConversationHeader
        conversation={conv}
        labels={labels}
        users={users}
        onReload={load}
      />
      <MessageThread messages={messages} />
      <ReplyBox
        conversationId={conversationId}
        channel={conv.channel}
        onMessageSent={handleMessageSent}
      />
    </div>
  )
}
