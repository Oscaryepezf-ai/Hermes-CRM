"use client";

import { Droppable } from "@hello-pangea/dnd";
import { LeadCard } from "./LeadCard";
import { cn } from "@/lib/utils";
import type { LeadForBoard } from "@/types/leads";
import type { LucideIcon } from "lucide-react";

interface StageColumnProps {
  droppableId:   string;
  label:         string;
  icon:          LucideIcon;
  bgColor:       string;
  headerColor:   string;
  leads:         LeadForBoard[];
  selectedLeadId: string | null;
  onSelectLead:  (id: string) => void;
}

export function StageColumn({
  droppableId,
  label,
  icon: Icon,
  bgColor,
  headerColor,
  leads,
  selectedLeadId,
  onSelectLead,
}: StageColumnProps) {
  return (
    <div className="flex flex-col w-[300px] flex-shrink-0 rounded-xl overflow-hidden border border-medical-border">
      {/* Column header */}
      <div className={cn("flex items-center gap-2 px-3 h-12 border-b border-medical-border", headerColor)}>
        <Icon className="w-3.5 h-3.5 text-gray-600" />
        <span className="text-xs font-semibold text-gray-700 flex-1">{label}</span>
        <span className="bg-white/70 text-gray-600 text-xs font-medium rounded-full px-2 py-0.5">
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
              "flex-1 flex flex-col gap-2 p-2 min-h-[calc(100vh-200px)] overflow-y-auto scrollbar-thin transition-colors",
              snapshot.isDraggingOver ? "bg-indigo-50/60" : bgColor
            )}
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
              <div className="flex-1 flex items-center justify-center py-8">
                <p className="text-xs text-gray-300">Sin leads</p>
              </div>
            )}
          </div>
        )}
      </Droppable>
    </div>
  );
}
