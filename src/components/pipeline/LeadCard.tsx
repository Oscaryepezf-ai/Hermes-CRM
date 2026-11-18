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
            "bg-surface rounded-2xl p-4 select-none",
            // Only transition safe properties: NEVER transition "all" on a Draggable
            // (transform/opacity transitions during drag cause lag and a broken visual)
            "transition-[box-shadow,opacity] duration-150",
            snapshot.isDragging
              ? "cursor-grabbing opacity-95 shadow-[var(--shadow-panel)]"
              : "cursor-grab hover:shadow-[var(--shadow-card-hover)]",
            isSelected && !snapshot.isDragging
              ? "ring-2 ring-brand-400/70 shadow-[var(--shadow-card-focus)]"
              : !snapshot.isDragging && "shadow-[var(--shadow-card)]",
          )}
        >
          {/* Row 1: Avatar + Priority */}
          <div className="flex items-start justify-between gap-2">
            <div className={cn("w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-semibold", avatar.bg, avatar.text)}>
              {initials}
            </div>
            <span
              className="text-[11px] font-medium px-2.5 py-0.5 rounded-full flex-shrink-0"
              style={{ background: priority.bg, color: priority.text }}
            >
              {priority.label}
            </span>
          </div>

          {/* Name */}
          <p className="mt-3 text-[15px] font-semibold text-ink-primary leading-tight truncate">
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
          <p className="text-xs text-ink-tertiary mt-0.5 tabular-nums">{lead.phone}</p>

          {/* Treatment */}
          <div className="mt-3 inline-flex items-center gap-1.5 bg-brand-50 text-brand-700 rounded-full px-2.5 py-1 max-w-full">
            <Stethoscope className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="text-xs font-medium truncate">
              {TREATMENT_LABELS[lead.treatment]}
            </span>
          </div>

          {/* Last note / message */}
          <p className="mt-2.5 text-xs text-ink-tertiary italic line-clamp-1 leading-snug">
            {lead.notes
              ? `"${lead.notes}"`
              : <span className="not-italic">Sin notas aún</span>
            }
          </p>

          {/* Row bottom: Channel chip + Time */}
          <div className="mt-3 flex items-center justify-between gap-2">
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5"
              style={{ background: channel.dot + "1A" }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ background: channel.dot }}
              />
              <span className="text-[11px] font-medium" style={{ color: channel.text }}>
                {channel.label}
              </span>
            </span>
            <span className="text-[11px] text-ink-tertiary text-right">
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
