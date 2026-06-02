"use client";

import { useState } from "react";
import { Droppable } from "@hello-pangea/dnd";
import { Check, X } from "lucide-react";
import { LeadCard } from "./LeadCard";
import { StageOptionsMenu } from "./StageOptionsMenu";
import { cn } from "@/lib/utils";
import { renameClinicStage } from "@/lib/actions/stages";
import { toast } from "sonner";
import type { LeadForBoard } from "@/types/leads";
import type { PipelineStageInfo } from "./PipelineBoard";

interface StageColumnProps {
  stage:          PipelineStageInfo;
  leads:          LeadForBoard[];
  selectedLeadId: string | null;
  onSelectLead:   (id: string) => void;
  allStages:      PipelineStageInfo[];
  canMoveLeft:    boolean;
  canMoveRight:   boolean;
  onMoveLeft:     () => void;
  onMoveRight:    () => void;
  onStageChanged: () => void;
  userRole:       string;
}

export function StageColumn({
  stage, leads, selectedLeadId, onSelectLead,
  allStages, canMoveLeft, canMoveRight,
  onMoveLeft, onMoveRight, onStageChanged,
  userRole,
}: StageColumnProps) {
  const [hovered,  setHovered]  = useState(false);
  const [editing,  setEditing]  = useState(false);
  const [editName, setEditName] = useState(stage.name);
  const [saving,   setSaving]   = useState(false);

  const borderColor = stage.color + '40';
  const isConvertido = stage.slug === 'convertido';
  const canAdmin    = userRole === 'ADMIN';

  const handleRenameSubmit = async () => {
    if (editName.trim().length < 2) { toast.error("Nombre muy corto"); return; }
    setSaving(true);
    const res = await renameClinicStage(stage.id, editName.trim());
    setSaving(false);
    if (res.success) {
      toast.success("Etapa renombrada");
      setEditing(false);
      onStageChanged();
    } else {
      toast.error(res.error);
    }
  };

  const handleRenameCancel = () => {
    setEditName(stage.name);
    setEditing(false);
  };

  return (
    <div
      className="stage-col flex flex-col w-[280px] flex-shrink-0 rounded-[12px] overflow-hidden"
      style={{
        background:  stage.bgColor,
        border:      `1px solid ${borderColor}`,
        boxShadow:   "var(--shadow-col, 0 1px 3px rgba(0,0,0,0.06))",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Column header */}
      <div
        className="stage-col-hdr flex items-center justify-between px-[14px] py-[11px] border-b"
        style={{ background: stage.headerBgColor, borderColor }}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span
            className="w-[7px] h-[7px] rounded-full flex-shrink-0"
            style={{ background: stage.color }}
          />
          {editing ? (
            <div className="flex items-center gap-1 flex-1 min-w-0">
              <input
                autoFocus
                value={editName}
                onChange={e => setEditName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleRenameSubmit();
                  if (e.key === 'Escape') handleRenameCancel();
                }}
                className="flex-1 min-w-0 h-6 px-1.5 text-[13px] font-semibold bg-white/70 rounded border border-current/20 focus:outline-none"
                style={{ color: stage.color }}
                maxLength={40}
              />
              <button
                onClick={handleRenameSubmit}
                disabled={saving}
                className="w-5 h-5 flex items-center justify-center rounded hover:bg-black/10 transition-colors text-emerald-600"
              >
                <Check className="w-3 h-3" />
              </button>
              <button
                onClick={handleRenameCancel}
                className="w-5 h-5 flex items-center justify-center rounded hover:bg-black/10 transition-colors text-red-500"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <span
              className="text-[14px] font-bold leading-tight truncate"
              style={{ color: stage.color }}
            >
              {stage.name}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          <span
            className="text-[11px] font-[550] px-2 py-0.5 rounded-[9999px]"
            style={{ background: "rgba(255,255,255,0.65)", color: stage.color }}
          >
            {leads.length}
          </span>
          {canAdmin && !editing && (hovered || stage.isCustom) && (
            <StageOptionsMenu
              stage={stage}
              allStages={allStages}
              canMoveLeft={canMoveLeft}
              canMoveRight={canMoveRight}
              onRename={() => { setEditName(stage.name); setEditing(true) }}
              onMoveLeft={onMoveLeft}
              onMoveRight={onMoveRight}
              onDeleted={onStageChanged}
            />
          )}
        </div>
      </div>

      {/* Droppable area */}
      <Droppable droppableId={stage.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={cn(
              "stage-col-body flex-1 flex flex-col gap-2 px-[10px] py-[12px]",
              "min-h-[200px] overflow-y-auto scrollbar-thin",
              "transition-colors duration-100",
              snapshot.isDraggingOver && "is-dragging-over"
            )}
            style={{
              background:  snapshot.isDraggingOver ? "rgba(99,102,241,0.05)" : stage.bgColor,
              maxHeight:   "calc(100vh - 160px)",
            }}
          >
            {leads.map((lead, index) => (
              <LeadCard
                key={lead.id}
                lead={lead}
                index={index}
                isSelected={selectedLeadId === lead.id}
                onSelect={onSelectLead}
                showConvertedBadge={isConvertido}
                userRole={userRole}
              />
            ))}
            {provided.placeholder}

            {leads.length === 0 && !snapshot.isDraggingOver && (
              <div
                className="flex-1 flex items-center justify-center py-8 rounded-[8px] border-2 border-dashed"
                style={{ borderColor }}
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
