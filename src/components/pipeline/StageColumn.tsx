"use client";

import { Droppable } from "@hello-pangea/dnd";
import { LeadCard } from "./LeadCard";
import { cn } from "@/lib/utils";
import type { LeadForBoard } from "@/types/leads";

interface StageColumnProps {
  droppableId:    string;
  label:          string;
  dotColor:       string;
  textColor:      string;
  bgColor:        string;
  headerColor:    string;
  borderColor:    string;
  leads:          LeadForBoard[];
  selectedLeadId: string | null;
  onSelectLead:   (id: string) => void;
}

export function StageColumn({
  droppableId, label, dotColor, textColor,
  bgColor, headerColor, borderColor,
  leads, selectedLeadId, onSelectLead,
}: StageColumnProps) {
  return (
    <div
      className="flex flex-col w-[280px] flex-shrink-0 rounded-[12px] overflow-hidden"
      style={{
        background: bgColor,
        border: `1px solid ${borderColor}`,
        boxShadow: "var(--shadow-col)",
      }}
    >
      {/* Column header */}
      <div
        className="flex items-center justify-between px-[14px] py-[11px] border-b"
        style={{ background: headerColor, borderColor: borderColor }}
      >
        <div className="flex items-center gap-2">
          <span
            className="w-[7px] h-[7px] rounded-full flex-shrink-0"
            style={{ background: dotColor }}
          />
          <span
            className="text-[14px] font-bold leading-tight"
            style={{ color: textColor }}
          >
            {label}
          </span>
        </div>
        <span
          className="text-[11px] font-[550] px-2 py-0.5 rounded-[9999px]"
          style={{ background: "rgba(255,255,255,0.65)", color: textColor }}
        >
          {leads.length}
        </span>
      </div>

      {/* Droppable area */}
      <Droppable droppableId={droppableId}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={cn(
              "flex-1 flex flex-col gap-2 px-[10px] py-[12px]",
              // min-h ensures empty columns remain droppable targets
              "min-h-[200px] overflow-y-auto scrollbar-thin",
              // transition only background color, never transform
              "transition-colors duration-100"
            )}
            style={{
              background: snapshot.isDraggingOver ? "rgba(99,102,241,0.05)" : bgColor,
              maxHeight: "calc(100vh - 160px)",
            }}
          >
            {leads.map((lead, index) => (
              <LeadCard
                key={lead.id}
                lead={lead}
                index={index}
                isSelected={selectedLeadId === lead.id}
                onSelect={onSelectLead}
              />
            ))}
            {provided.placeholder}

            {leads.length === 0 && !snapshot.isDraggingOver && (
              <div
                className="flex-1 flex items-center justify-center py-8 rounded-[8px] border-2 border-dashed"
                style={{ borderColor: borderColor }}
              >
                <p className="text-[11px] text-ink-disabled">Sin leads en esta etapa</p>
              </div>
            )}
          </div>
        )}
      </Droppable>
    </div>
  );
}
