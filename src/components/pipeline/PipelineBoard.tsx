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
      <div className="flex items-center justify-between px-6 py-4 border-b border-line-subtle bg-surface">
        <div>
          <h2 className="text-[18px] font-bold text-ink-primary leading-tight">Pipeline de Pacientes</h2>
          <p className="text-[12px] text-ink-tertiary mt-0.5">Seguimiento comercial en tiempo real</p>
        </div>
        <Button
          onClick={() => setShowCreate(true)}
          className="bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium h-8 px-3 rounded-[8px]"
          style={{ boxShadow: "0 1px 3px rgba(99,102,241,0.25)" }}
        >
          <Plus className="w-3.5 h-3.5 mr-1.5" />
          Nuevo Lead
        </Button>
      </div>

      {/* Board */}
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-4 overflow-x-auto p-5 h-full items-start">
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
