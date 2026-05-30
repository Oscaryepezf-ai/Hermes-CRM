"use client";

import { useState, useRef, useEffect } from "react";
import { Zap, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { QUICK_REPLIES, resolveQuickReply } from "@/lib/quick-replies-data";
import type { QuickReply, QuickReplyCategory } from "@/types/quick-replies";
import type { DentalTreatment } from "@prisma/client";

// ─── Category config ───────────────────────────────────────────────────────────

const CATEGORY_CONFIG: Record<QuickReplyCategory, { label: string; emoji: string }> = {
  entrante:     { label: "FASE ENTRANTE",         emoji: "👋" },
  agendamiento: { label: "AGENDAMIENTO",           emoji: "📅" },
  seguimiento:  { label: "SEGUIMIENTO / RESCATE",  emoji: "🔄" },
};

const CATEGORY_ORDER: QuickReplyCategory[] = ["entrante", "agendamiento", "seguimiento"];

// ─── Props ─────────────────────────────────────────────────────────────────────

interface QuickRepliesProps {
  lead: { fullName: string; treatment: DentalTreatment };
  clinicName: string;
  onSelect: (resolvedText: string) => void;
}

// ─── Item ──────────────────────────────────────────────────────────────────────

function ReplyItem({
  reply,
  isHighlighted,
  onSelect,
}: {
  reply: QuickReply;
  isHighlighted?: boolean;
  onSelect: (r: QuickReply) => void;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => {
        // prevent textarea blur before selection
        e.preventDefault();
        onSelect(reply);
      }}
      className={cn(
        "w-[calc(100%-8px)] mx-1 flex items-center justify-between gap-2",
        "px-3 py-2.5 rounded-lg transition-colors text-left",
        isHighlighted ? "bg-indigo-50" : "hover:bg-slate-50"
      )}
    >
      <div className="flex items-start gap-2 min-w-0">
        <span className="text-base leading-none flex-shrink-0 mt-0.5">{reply.emoji}</span>
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-gray-800 leading-tight">
            {reply.title}
          </p>
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

// ─── Main component ────────────────────────────────────────────────────────────

export function QuickReplies({ lead, clinicName, onSelect }: QuickRepliesProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Focus search when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => searchRef.current?.focus(), 50);
    } else {
      setSearch("");
    }
  }, [open]);

  const filtered = QUICK_REPLIES.filter((r) => {
    const q = search.toLowerCase();
    return (
      r.title.toLowerCase().includes(q) ||
      r.shortcut.toLowerCase().includes(q) ||
      r.body.toLowerCase().includes(q)
    );
  });

  const handleSelect = (reply: QuickReply) => {
    onSelect(resolveQuickReply(reply, lead, clinicName));
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative flex-shrink-0">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Respuestas rápidas (o escribe /)"
        className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center transition-colors",
          open
            ? "bg-indigo-100 text-indigo-500"
            : "text-[#54656F] hover:bg-gray-100"
        )}
      >
        <Zap className="w-5 h-5" />
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute bottom-full left-0 mb-2 w-[340px] max-[400px]:w-[calc(100vw-2rem)] bg-white rounded-2xl border border-medical-border shadow-xl overflow-hidden z-50">
          {/* Search bar */}
          <div className="flex items-center gap-2 px-3 py-2.5 border-b border-medical-border">
            <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <input
              ref={searchRef}
              type="text"
              placeholder="Buscar plantilla o escribe /shortcut..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full text-sm outline-none bg-transparent"
            />
          </div>

          {/* List */}
          <div className="max-h-[320px] overflow-y-auto scrollbar-thin pb-2">
            {filtered.length === 0 ? (
              <p className="text-center text-sm text-gray-400 py-6">
                No se encontraron plantillas
              </p>
            ) : (
              CATEGORY_ORDER.map((cat) => {
                const items = filtered.filter((r) => r.category === cat);
                if (items.length === 0) return null;
                const { label, emoji } = CATEGORY_CONFIG[cat];
                return (
                  <div key={cat}>
                    <p className="px-3 pt-3 pb-1 text-[10px] uppercase tracking-wide font-medium text-gray-400">
                      {emoji} {label}
                    </p>
                    {items.map((reply) => (
                      <ReplyItem
                        key={reply.id}
                        reply={reply}
                        onSelect={handleSelect}
                      />
                    ))}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
