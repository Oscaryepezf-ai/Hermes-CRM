"use client";

import { useState } from "react";
import { Draggable } from "@hello-pangea/dnd";
import { Camera, Share2, MessageCircle, Globe, Users, Search, HelpCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { TREATMENT_LABELS, CHANNEL_LABELS } from "@/types/leads";
import type { LeadForBoard, MarketingChannel } from "@/types/leads";
import type { LucideIcon } from "lucide-react";

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

function getPriority(updatedAt: Date): { label: string; className: string } {
  const days = Math.floor(
    (Date.now() - new Date(updatedAt).getTime()) / (1000 * 60 * 60 * 24)
  );
  if (days > 7) return { label: "alta", className: "bg-red-100 text-red-700" };
  if (days >= 3) return { label: "normal", className: "bg-blue-100 text-blue-700" };
  return { label: "baja", className: "bg-gray-100 text-gray-600" };
}

const CHANNEL_ICON_MAP: Record<MarketingChannel, { icon: LucideIcon; color: string }> = {
  WHATSAPP: { icon: MessageCircle, color: "text-green-500" },
  INSTAGRAM: { icon: Camera, color: "text-pink-500" },
  FACEBOOK: { icon: Share2, color: "text-blue-500" },
  REFERIDO: { icon: Users, color: "text-teal-500" },
  GOOGLE: { icon: Search, color: "text-gray-500" },
  TIKTOK: { icon: Globe, color: "text-gray-700" },
  OTRO: { icon: HelpCircle, color: "text-gray-400" },
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface LeadCardProps {
  lead: LeadForBoard;
  index: number;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function LeadCard({ lead, index, isSelected, onSelect }: LeadCardProps) {
  const [isPressed, setIsPressed] = useState(false);

  const priority = getPriority(lead.updatedAt);
  const { icon: ChannelIcon, color: channelColor } = CHANNEL_ICON_MAP[lead.channel];
  const avatarColor = getAvatarColor(lead.fullName);
  const initials = getInitials(lead.fullName);

  const handleClick = () => {
    setIsPressed(true);
    onSelect(lead.id);
    setTimeout(() => setIsPressed(false), 150);
  };

  return (
    <Draggable draggableId={lead.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={handleClick}
          className={cn(
            "bg-medical-card rounded-2xl border p-3 cursor-pointer select-none",
            "transition-all duration-150",
            snapshot.isDragging
              ? "shadow-lg opacity-90 rotate-1"
              : "shadow-sm hover:shadow-md hover:border-gray-300",
            isSelected
              ? "ring-2 ring-teal-400 border-teal-300 shadow-md"
              : "border-medical-border",
            isPressed && "scale-[0.98]"
          )}
        >
          {/* Row 1: Avatar + Name + Priority badge */}
          <div className="flex items-start gap-2.5">
            <div className={cn("w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0", avatarColor)}>
              <span className="text-white text-sm font-medium">{initials}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <p className="text-sm font-semibold text-gray-900 leading-tight truncate">
                  {lead.fullName}
                </p>
                <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded-full flex-shrink-0", priority.className)}>
                  {priority.label}
                </span>
              </div>
              <a
                href={`https://wa.me/${lead.phone.replace(/\D/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1 text-xs text-green-600 hover:text-green-700 mt-0.5 group"
              >
                <MessageCircle className="w-3 h-3 flex-shrink-0" />
                <span className="group-hover:underline">{lead.phone}</span>
              </a>
            </div>
          </div>

          {/* Row 2: Treatment */}
          <p className="mt-2 text-xs text-gray-600 flex items-center gap-1">
            <span>🦷</span>
            {TREATMENT_LABELS[lead.treatment]}
          </p>

          {/* Row 3: Last message snippet */}
          <p className="mt-1.5 text-xs text-gray-400 italic truncate" aria-label="Último mensaje">
            {lead.notes ? `"${lead.notes}"` : "Sin mensajes aún"}
          </p>

          {/* Row 4: Channel + Time */}
          <div className="mt-2.5 pt-2 border-t border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <ChannelIcon className={cn("w-3.5 h-3.5", channelColor)} />
              <span>{CHANNEL_LABELS[lead.channel]}</span>
            </div>
            <span className="text-xs text-gray-400">
              {lead.lastContactAt
                ? formatDistanceToNow(new Date(lead.lastContactAt), { addSuffix: true, locale: es })
                : "Sin contacto"}
            </span>
          </div>
        </div>
      )}
    </Draggable>
  );
}
