"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { DragDropContext, type DropResult } from "@hello-pangea/dnd";
import { StageColumn } from "./StageColumn";
import { LeadFormModal } from "./LeadFormModal";
import { AddStageButton } from "./AddStageButton";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { updateLeadStage } from "@/lib/actions/leads";
import { fetchClinicStages, reorderClinicStages } from "@/lib/actions/stages";
import { toast } from "sonner";
import type { LeadForBoard } from "@/types/leads";
import type { LeadWithStage } from "@/types";

export type PipelineStageInfo = {
  id:            string
  name:          string
  slug:          string
  color:         string
  bgColor:       string
  headerBgColor: string
  order:         number
  isProtected:   boolean
  isCustom:      boolean
  icon:          string | null
  _count:        { leads: number }
}

interface PipelineBoardProps {
  initialLeads:   LeadForBoard[];
  userRole:       string;
  selectedLeadId: string | null;
  onSelectLead:   (id: string | null) => void;
}

export function PipelineBoard({ initialLeads, userRole, selectedLeadId, onSelectLead }: PipelineBoardProps) {
  const router = useRouter();
  const [leads,  setLeads]  = useState<LeadForBoard[]>(initialLeads);
  const [stages, setStages] = useState<PipelineStageInfo[]>([]);
  const [showCreateModal, setShowCreate] = useState(false);

  useEffect(() => { setLeads(initialLeads) }, [initialLeads]);

  const loadStages = useCallback(() => {
    fetchClinicStages().then(res => {
      if (res.success) setStages(res.data as PipelineStageInfo[]);
    });
  }, []);

  useEffect(() => { loadStages() }, [loadStages]);

  const getLeadsForStage = useCallback(
    (stageId: string) => {
      const isFirstStage = stages.length > 0 && stages[0].id === stageId;
      return leads.filter(l => l.stageId === stageId || (isFirstStage && !l.stageId));
    },
    [leads, stages]
  );

  const onDragEnd = async (result: DropResult) => {
    const { draggableId, source, destination } = result;
    if (!destination || destination.droppableId === source.droppableId) return;

    const newStageId = destination.droppableId;
    setLeads(prev => prev.map(l => l.id === draggableId ? { ...l, stageId: newStageId } : l));

    const res = await updateLeadStage(draggableId, newStageId);
    if (!res.success) {
      setLeads(prev => prev.map(l =>
        l.id === draggableId ? { ...l, stageId: source.droppableId } : l
      ));
      toast.error(res.error ?? "Error al mover el lead");
    }
  };

  const handleMoveStage = async (stageId: string, direction: 'left' | 'right') => {
    const idx = stages.findIndex(s => s.id === stageId);
    if (idx === -1) return;

    const newStages = [...stages];
    const swapIdx   = direction === 'left' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= newStages.length) return;

    [newStages[idx], newStages[swapIdx]] = [newStages[swapIdx], newStages[idx]];
    setStages(newStages);

    const res = await reorderClinicStages(newStages.map(s => s.id));
    if (!res.success) {
      loadStages();
      toast.error(res.error ?? "Error al reordenar");
    }
  };

  const canEdit = userRole === 'ADMIN';

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-6 pt-5 pb-1">
        <div className="min-w-0">
          <h2 className="text-2xl font-bold text-ink-primary leading-tight tracking-tight">Pipeline de pacientes</h2>
          <p className="text-[13px] text-ink-tertiary mt-1">
            {leads.length} {leads.length === 1 ? "lead" : "leads"} en seguimiento
          </p>
        </div>
        <Button
          onClick={() => setShowCreate(true)}
          className="bg-brand-gradient hover:opacity-95 text-white text-[13px] font-semibold h-9 px-4 rounded-full"
          style={{ boxShadow: "var(--shadow-brand)" }}
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Nuevo lead
        </Button>
      </div>

      {/* Board */}
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-4 overflow-x-auto px-6 py-5 h-full items-start">
          {stages.map((stage, idx) => {
            const isBeforeLast  = idx < stages.length - 2
            const isProtected   = stage.isProtected
            const prevProtected = idx > 0 ? stages[idx - 1].isProtected : false
            const nextProtected = idx < stages.length - 1 ? stages[idx + 1].isProtected : false

            return (
              <StageColumn
                key={stage.id}
                stage={stage}
                leads={getLeadsForStage(stage.id)}
                selectedLeadId={selectedLeadId}
                onSelectLead={id => onSelectLead(selectedLeadId === id ? null : id)}
                allStages={stages}
                canMoveLeft={!isProtected && idx > 0 && !prevProtected}
                canMoveRight={!isProtected && idx < stages.length - 1 && !nextProtected}
                onMoveLeft={() => handleMoveStage(stage.id, 'left')}
                onMoveRight={() => handleMoveStage(stage.id, 'right')}
                onStageChanged={loadStages}
                userRole={userRole}
              />
            )
          })}

          {/* Add stage button — only before protected end stages */}
          {canEdit && stages.length > 0 && (
            <AddStageButton
              insertAfterOrder={Math.max(0, stages.filter(s => !s.isProtected).length - 1 + 1)}
              disabled={stages.length >= 12}
              onCreated={loadStages}
            />
          )}
        </div>
      </DragDropContext>

      {showCreateModal && (
        <LeadFormModal
          stages={stages as unknown as import("@/types").PipelineStage[]}
          onClose={() => setShowCreate(false)}
          onCreated={(_lead: LeadWithStage) => { setShowCreate(false); router.refresh() }}
        />
      )}
    </>
  );
}
