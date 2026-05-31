"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  ChevronLeft,
  Phone,
  Video,
  Paperclip,
  Smile,
  Send,
  Mic,
  Camera,
  Check,
  CheckCheck,
  AlertCircle,
  X,
} from "lucide-react";
import { format, isToday, isYesterday, isSameDay } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { getMessagesByLead, sendMessage } from "@/lib/actions/messages";
import { sendMessengerReply, sendInstagramReply, getUnifiedMessages } from "@/lib/actions/messenger";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { QuickReplies } from "./QuickReplies";
import { ChannelBadge } from "./ChannelBadge";
import { QUICK_REPLIES, resolveQuickReply } from "@/lib/quick-replies-data";
import type { Message, MarketingChannel } from "@prisma/client";
import type { DentalTreatment } from "@prisma/client";
import type { QuickReply } from "@/types/quick-replies";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  "bg-indigo-500",
  "bg-violet-500",
  "bg-teal-500",
  "bg-amber-500",
  "bg-rose-500",
];

function getAvatarColor(name: string): string {
  const hash = name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

function formatDaySeparator(date: Date): string {
  if (isToday(date)) return "Hoy";
  if (isYesterday(date)) return "Ayer";
  return format(date, "d MMM yyyy", { locale: es });
}

function StatusIcon({ status }: { status: Message["status"] }) {
  if (status === "SENT")      return <Check      className="w-3 h-3 text-gray-400" />;
  if (status === "DELIVERED") return <CheckCheck className="w-3 h-3 text-gray-400" />;
  if (status === "READ")      return <CheckCheck className="w-3 h-3 text-[#34B7F1]" />;
  return <AlertCircle className="w-3 h-3 text-red-400" />;
}

// ─── Slash-menu item (reuses same layout as QuickReplies) ──────────────────────

function SlashMenuItem({
  reply,
  isHighlighted,
  onSelect,
}: {
  reply: QuickReply;
  isHighlighted: boolean;
  onSelect: (r: QuickReply) => void;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault(); // keep textarea focused
        onSelect(reply);
      }}
      className={cn(
        "w-full flex items-center justify-between gap-2 px-3 py-2.5 transition-colors text-left",
        isHighlighted ? "bg-indigo-50" : "hover:bg-slate-50"
      )}
    >
      <div className="flex items-start gap-2 min-w-0">
        <span className="text-base leading-none flex-shrink-0 mt-0.5">{reply.emoji}</span>
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-gray-800 leading-tight">{reply.title}</p>
          <p className="text-xs text-gray-500 truncate leading-snug mt-0.5">
            {reply.body.replace(/\n/g, " ")}
          </p>
        </div>
      </div>
      <span className="ml-2 flex-shrink-0 bg-gray-100 text-gray-500 text-xs font-mono px-2 py-0.5 rounded-full whitespace-nowrap">
        {reply.shortcut}
      </span>
    </button>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface ChatPanelProps {
  leadId:         string;
  leadName:       string;
  leadPhone:      string;
  leadTreatment:  DentalTreatment;
  clinicName:     string;
  onClose:        () => void;
  embedded?:      boolean;
  channel?:       MarketingChannel;
}

// ─── Optimistic message shape ─────────────────────────────────────────────────

type OptimisticMessage = Message & { isOptimistic?: boolean };

// ─── Component ────────────────────────────────────────────────────────────────

export function ChatPanel({
  leadId,
  leadName,
  leadPhone,
  leadTreatment,
  clinicName,
  onClose,
  embedded = false,
  channel = "WHATSAPP",
}: ChatPanelProps) {
  const [messages,      setMessages]      = useState<OptimisticMessage[]>([]);
  const [inputText,     setInputText]     = useState("");
  const [isLoading,     setIsLoading]     = useState(true);
  const [isSending,     setIsSending]     = useState(false);
  // Slash-menu state
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashFilter,   setSlashFilter]   = useState("");
  const [slashIndex,    setSlashIndex]    = useState(0);

  const bottomRef   = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const avatarColor = getAvatarColor(leadName);
  const initials    = getInitials(leadName);

  // Derived lead shape for resolvers
  const leadShape = { fullName: leadName, treatment: leadTreatment };

  // Slash-menu filtered results (max 5)
  const slashFiltered: QuickReply[] = showSlashMenu
    ? QUICK_REPLIES.filter(
        (r) =>
          r.shortcut.toLowerCase().includes(slashFilter.toLowerCase()) ||
          r.title.toLowerCase().includes(slashFilter.toLowerCase())
      ).slice(0, 5)
    : [];

  // ─── Data fetching ──────────────────────────────────────────────────────────

  const fetchMessages = useCallback(async () => {
    if (channel === "FACEBOOK" || channel === "INSTAGRAM") {
      const res = await getUnifiedMessages(leadId);
      if (res.success) setMessages(res.data as Message[]);
    } else {
      const res = await getMessagesByLead(leadId);
      if (res.success) setMessages(res.data);
    }
  }, [leadId, channel]);

  useEffect(() => {
    setIsLoading(true);
    fetchMessages().finally(() => setIsLoading(false));
  }, [fetchMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const interval = setInterval(fetchMessages, 15_000);
    return () => clearInterval(interval);
  }, [fetchMessages]);

  // ─── Input handlers ─────────────────────────────────────────────────────────

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInputText(val);

    // Auto-grow
    const el = e.target;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 96) + "px";

    // Slash-menu trigger
    if (val === "/" || val.startsWith("/")) {
      setShowSlashMenu(true);
      setSlashFilter(val.slice(1));
      setSlashIndex(0);
    } else {
      setShowSlashMenu(false);
      setSlashFilter("");
    }
  };

  const handleQuickReplySelect = (resolvedText: string) => {
    setInputText(resolvedText);
    setShowSlashMenu(false);
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height =
        Math.min(textareaRef.current.scrollHeight, 96) + "px";
    }
    // Focus + move cursor to end
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(resolvedText.length, resolvedText.length);
    });
  };

  const handleSlashSelect = (reply: QuickReply) => {
    const resolved = resolveQuickReply(reply, leadShape, clinicName);
    handleQuickReplySelect(resolved);
  };

  const handleSend = async () => {
    const content = inputText.trim();
    if (!content || isSending) return;

    setInputText("");
    setShowSlashMenu(false);
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    const optimisticMsg: OptimisticMessage = {
      id:                `opt-${Date.now()}`,
      leadId,
      direction:         "OUTBOUND",
      content,
      mediaUrl:          null,
      status:            "SENT",
      sentAt:            new Date(),
      deliveredAt:       null,
      readAt:            null,
      channel:           channel ?? "WHATSAPP",
      externalMessageId: null,
      isOptimistic: true,
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    setIsSending(true);

    const res = channel === "FACEBOOK"
      ? await sendMessengerReply({ leadId, content })
      : channel === "INSTAGRAM"
      ? await sendInstagramReply({ leadId, content })
      : await sendMessage({ leadId, content });

    if (!res.success) {
      setMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id));
      toast.error(res.error ?? "Error al enviar el mensaje");
    } else {
      // Messenger reply returns no data — refresh from server
      if (channel === "FACEBOOK") {
        setMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id));
        await fetchMessages();
      } else {
        const msgData = (res as { success: true; data: Message }).data;
        setMessages((prev) =>
          prev.map((m) => (m.id === optimisticMsg.id ? { ...msgData } : m))
        );
      }
    }

    setIsSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Slash-menu navigation
    if (showSlashMenu && slashFiltered.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSlashIndex((i) => Math.min(i + 1, slashFiltered.length - 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSlashIndex((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        handleSlashSelect(slashFiltered[slashIndex]);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setShowSlashMenu(false);
        return;
      }
    }

    // Normal send on Enter
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header — hidden when embedded in LeadJourneyPanel */}
      <div className={cn("bg-wa-header flex items-center gap-3 px-3 py-2 flex-shrink-0", embedded && "hidden")}>
        <button
          onClick={onClose}
          className="text-white/80 hover:text-white md:hidden"
          aria-label="Cerrar chat"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className={cn("w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0", avatarColor)}>
          <span className="text-white text-sm font-medium">{initials}</span>
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-white font-medium text-sm leading-tight truncate">{leadName}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            {channel !== "WHATSAPP" && (
              <ChannelBadge channel={channel} size="xs" />
            )}
            <p className="text-green-200 text-xs leading-tight">{leadPhone}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button aria-label="Llamar" className="text-white/80 hover:text-white">
            <Phone className="w-5 h-5" />
          </button>
          <button aria-label="Videollamada" className="text-white/80 hover:text-white">
            <Video className="w-5 h-5" />
          </button>
          <button onClick={onClose} aria-label="Cerrar panel" className="hidden md:flex text-white/80 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 bg-wa-bg scrollbar-thin" role="log" aria-label="Conversación">
        {isLoading ? (
          <div className="flex flex-col gap-3">
            <div className="flex justify-start">
              <Skeleton className="h-12 w-48 rounded-bubble rounded-tl-none" />
            </div>
            <div className="flex justify-end">
              <Skeleton className="h-12 w-56 rounded-bubble rounded-tr-none" />
            </div>
            <div className="flex justify-start">
              <Skeleton className="h-8 w-40 rounded-bubble rounded-tl-none" />
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-gray-500 text-center">
              Inicia la conversación con {leadName}
            </p>
          </div>
        ) : (
          <>
            {messages.map((msg, idx) => {
              const isOutbound = msg.direction === "OUTBOUND";
              const msgDate    = new Date(msg.sentAt);
              const prevMsg    = messages[idx - 1];
              const showDaySep = !prevMsg || !isSameDay(new Date(prevMsg.sentAt), msgDate);

              return (
                <div key={msg.id}>
                  {showDaySep && (
                    <div className="flex justify-center my-3">
                      <span className="bg-white/60 rounded-full px-3 py-1 text-xs text-gray-500">
                        {formatDaySeparator(msgDate)}
                      </span>
                    </div>
                  )}
                  <div className={cn("flex mb-1.5", isOutbound ? "justify-end" : "justify-start")}>
                    <div
                      className={cn(
                        "max-w-[75%] rounded-bubble px-3 py-2",
                        isOutbound
                          ? "bg-wa-bubble-out rounded-tr-none"
                          : "bg-wa-bubble-in rounded-tl-none shadow-sm"
                      )}
                      role="article"
                    >
                      <p className="text-sm text-gray-800 whitespace-pre-wrap break-words">
                        {msg.content}
                      </p>
                      <div className={cn("flex items-center gap-1 mt-1", isOutbound ? "justify-end" : "justify-start")}>
                        <span className="text-[10px] text-gray-400">{format(msgDate, "HH:mm")}</span>
                        {isOutbound && <StatusIcon status={msg.status} />}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </>
        )}
      </div>

      {/* Input bar — relative so slash menu positions above it */}
      <div className="relative flex-shrink-0">
        {/* Slash menu */}
        {showSlashMenu && slashFiltered.length > 0 && (
          <div className="absolute bottom-full left-0 right-0 mb-1 bg-white rounded-xl border border-medical-border shadow-lg overflow-hidden z-50">
            {slashFiltered.map((reply, idx) => (
              <SlashMenuItem
                key={reply.id}
                reply={reply}
                isHighlighted={idx === slashIndex}
                onSelect={handleSlashSelect}
              />
            ))}
          </div>
        )}

        <div className="flex items-end gap-2 p-3 bg-wa-input-bg border-t border-gray-200">
          <button aria-label="Adjuntar archivo" className="text-[#54656F] flex-shrink-0 pb-1">
            <Paperclip className="w-5 h-5" />
          </button>
          <button aria-label="Emoji" className="text-[#54656F] flex-shrink-0 pb-1">
            <Smile className="w-5 h-5" />
          </button>

          {/* ⚡ Quick Replies */}
          <div className="flex-shrink-0 pb-1">
            <QuickReplies
              lead={leadShape}
              clinicName={clinicName}
              onSelect={handleQuickReplySelect}
            />
          </div>

          <textarea
            ref={textareaRef}
            value={inputText}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Escribe un mensaje o / para plantillas..."
            rows={1}
            className="flex-1 bg-white rounded-2xl px-4 py-2 text-sm outline-none resize-none max-h-24 scrollbar-thin"
          />

          <button aria-label="Cámara" className="text-[#54656F] flex-shrink-0 pb-1">
            <Camera className="w-5 h-5" />
          </button>

          {inputText.trim() ? (
            <button
              onClick={handleSend}
              disabled={isSending}
              aria-label="Enviar mensaje"
              className="w-10 h-10 rounded-full bg-[#25D366] flex items-center justify-center flex-shrink-0 hover:bg-[#1eb35a] transition-colors disabled:opacity-60"
            >
              {isSending ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send className="w-4 h-4 text-white" />
              )}
            </button>
          ) : (
            <button aria-label="Grabar audio" className="text-[#54656F] flex-shrink-0 pb-1">
              <Mic className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
