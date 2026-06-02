"use client";

import { Draggable } from "@hello-pangea/dnd";
import { Stethoscope } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { AgentIndicator } from "./AgentIndicator";
import { ConvertedBadge } from "./ConvertedBadge";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { TREATMENT_LABELS } from "@/types/leads";
import type { LeadForBoard, MarketingChannel } from "@/types/leads";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const AVATAR_PALETTE = [
  { bg: "bg-blue-100",   text: "text-blue-700"   },
  { bg: "bg-violet-100", text: "text-violet-700"  },
  { bg: "bg-teal-100",   text: "text-teal-700"    },
  { bg: "bg-amber-100",  text: "text-amber-700"   },
  { bg: "bg-rose-100",   text: "text-rose-700"    },
];

function getAvatar(name: string) {
  const hash = name.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
}

function getInitials(name: string) {
  return name.split(" ").slice(0, 2).map(n => n[0]).join("").toUpperCase();
}

function getPriority(updatedAt: Date): { label: string; bg: string; text: string } {
  const days = Math.floor((Date.now() - new Date(updatedAt).getTime()) / 86400000);
  if (days > 7)  return { label: "alta",   bg: "#FEF2F4", text: "#9B2335" };
  if (days >= 3) return { label: "normal", bg: "#EEF3FC", text: "#1E4A8A" };
  return              { label: "baja",   bg: "#F0F2F6", text: "#4A5568" };
}

const CHANNEL_CONFIG: Record<MarketingChannel, { dot: string; text: string; label: string }> = {
  WHATSAPP:  { dot: "#25D366", text: "#128C4A", label: "WhatsApp"  },
  INSTAGRAM: { dot: "#E1306C", text: "#C2185B", label: "Instagram" },
  FACEBOOK:  { dot: "#1877F2", text: "#0D5DBB", label: "Facebook"  },
  REFERIDO:  { dot: "#8B7CF6", text: "#6248C4", label: "Referido"  },
  GOOGLE:    { dot: "#4285F4", text: "#1A56C9", label: "Google"    },
  TIKTOK:    { dot: "#010101", text: "#4A5568", label: "TikTok"    },
  OTRO:      { dot: "#94A3B8", text: "#4A5568", label: "Otro"      },
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface LeadCardProps {
  lead:                LeadForBoard;
  index:               number;
  isSelected:          boolean;
  onSelect:            (id: string) => void;
  showConvertedBadge?: boolean;
  userRole?:           string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function LeadCard({ lead, index, isSelected, onSelect, showConvertedBadge, userRole }: LeadCardProps) {
  const priority = getPriority(lead.updatedAt);
  const channel  = CHANNEL_CONFIG[lead.channel];
  const avatar   = getAvatar(lead.fullName);
  const initials = getInitials(lead.fullName);

  return (
    <Draggable draggableId={lead.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={() => onSelect(lead.id)}
          className={cn(
            "bg-surface rounded-[10px] border p-[14px] select-none",
            // Only transition safe properties — NEVER transition: all on a Draggable
            // transition: transform/opacity during drag causes lag and broken visual
            "transition-[box-shadow,border-color,opacity] duration-150",
            snapshot.isDragging
              ? "cursor-grabbing opacity-90"
              : "cursor-grab hover:border-line-soft",
            isSelected && !snapshot.isDragging
              ? "border-brand-200 ring-1 ring-brand-200 shadow-[var(--shadow-card-focus)]"
              : !snapshot.isDragging
              ? "border-line-subtle shadow-[var(--shadow-card)]"
              : "border-line-soft",
          )}
        >
          {/* Row 1: Avatar + Priority */}
          <div className="flex items-start justify-between gap-2">
            <div className={cn("w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-[550]", avatar.bg, avatar.text)}>
              {initials}
            </div>
            <span
              className="text-[10px] font-medium px-2 py-0.5 rounded-[9999px] flex-shrink-0"
              style={{ background: priority.bg, color: priority.text }}
            >
              {priority.label}
            </span>
          </div>

          {/* Name */}
          <p className="mt-2.5 text-[14px] font-[550] text-ink-primary leading-tight truncate">
            {lead.fullName}
          </p>

          {/* Converted badge */}
          {showConvertedBadge && (
            <div className="mt-1.5" onClick={e => e.stopPropagation()}>
              <ConvertedBadge
                leadId={lead.id}
                active={lead.isNewPatientOfMonth}
                canEdit={userRole === 'ADMIN' || userRole === 'DOCTOR'}
              />
            </div>
          )}

          {/* Agent badge */}
          {lead.isAgentHandled && (
            <div className="mt-1">
              <AgentIndicator />
            </div>
          )}

          {/* Phone */}
          <p className="text-[11px] text-ink-tertiary mt-0.5">{lead.phone}</p>

          {/* Treatment */}
          <div className="mt-2 flex items-center gap-1.5">
            <Stethoscope className="w-3.5 h-3.5 text-ink-disabled flex-shrink-0" />
            <span className="text-[12px] font-medium text-ink-secondary">
              {TREATMENT_LABELS[lead.treatment]}
            </span>
          </div>

          {/* Last note / message */}
          <p className="mt-2 text-[12px] text-ink-tertiary italic line-clamp-1 leading-snug">
            {lead.notes
              ? `"${lead.notes}"`
              : <span className="not-italic text-ink-disabled">Sin notas aún</span>
            }
          </p>

          {/* Divider */}
          <div className="mt-3 border-t border-line-subtle" />

          {/* Row bottom: Channel dot + Time */}
          <div className="mt-2 flex items-center justify-between">
            <div className="flex items-center gap-[5px]">
              <span
                className="w-[5px] h-[5px] rounded-full flex-shrink-0"
                style={{ background: channel.dot }}
              />
              <span className="text-[10px] font-medium" style={{ color: channel.text }}>
                {channel.label}
              </span>
            </div>
            <span className="text-[11px] text-ink-tertiary">
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
