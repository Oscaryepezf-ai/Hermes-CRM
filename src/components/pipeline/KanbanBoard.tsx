"use client";

import { useState, useCallback } from "react";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import { LeadFormModal } from "./LeadFormModal";
import { LeadDetailModal } from "./LeadDetailModal";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { updateLeadStage } from "@/lib/actions/leads";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { LeadWithStage, PipelineStage } from "@/types";

interface KanbanBoardProps {
  initialLeads: LeadWithStage[];
  stages: PipelineStage[];
}

// Legacy board — superseded by PipelineBoard + PipelineLayout
export function KanbanBoard({ initialLeads, stages }: KanbanBoardProps) {
  const [leads, setLeads] = useState<LeadWithStage[]>(initialLeads);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState<LeadWithStage | null>(null);

  const getLeadsForStage = useCallback(
    (stageId: string) => leads.filter((l) => l.stageId === stageId),
    [leads]
  );

  const onDragEnd = async (result: DropResult) => {
    const { draggableId, source, destination } = result;
    if (!destination || destination.droppableId === source.droppableId) return;

    setLeads((prev) =>
      prev.map((lead) =>
        lead.id === draggableId
          ? { ...lead, stageId: destination.droppableId }
          : lead
      )
    );

    const res = await updateLeadStage(draggableId, destination.droppableId);
    if (!res.success) {
      setLeads((prev) =>
        prev.map((lead) =>
          lead.id === draggableId
            ? { ...lead, stageId: source.droppableId }
            : lead
        )
      );
      toast.error(res.error);
    }
  };

  const handleLeadCreated = (newLead: LeadWithStage) => {
    setLeads((prev) => [newLead, ...prev]);
    setShowCreateModal(false);
  };

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-ink-primary">Pipeline</h2>
          <p className="text-sm text-ink-tertiary mt-0.5">{leads.length} leads en total</p>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          className="bg-indigo-600 hover:bg-indigo-700"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Nuevo lead
        </Button>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {stages.map((stage) => (
            <div key={stage.id} className="flex flex-col w-64 flex-shrink-0">
              <div className="flex items-center gap-2 mb-3">
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: stage.color }}
                />
                <h3 className="text-xs font-semibold text-ink-secondary uppercase tracking-wide flex-1">
                  {stage.name}
                </h3>
                <span className="text-xs font-semibold text-ink-tertiary bg-inset rounded-full px-2 py-0.5">
                  {getLeadsForStage(stage.id).length}
                </span>
              </div>

              <Droppable droppableId={stage.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={cn(
                      "flex-1 min-h-32 rounded-xl p-2 space-y-2 transition-colors",
                      snapshot.isDraggingOver ? "bg-indigo-50" : "bg-canvas/50"
                    )}
                  >
                    {getLeadsForStage(stage.id).map((lead, index) => (
                      <Draggable key={lead.id} draggableId={lead.id} index={index}>
                        {(drag, dragSnap) => (
                          <div
                            ref={drag.innerRef}
                            {...drag.draggableProps}
                            {...drag.dragHandleProps}
                            onClick={() => setSelectedLead(lead)}
                            className={cn(
                              "bg-surface rounded-xl border border-line-subtle p-3 shadow-sm cursor-pointer",
                              dragSnap.isDragging && "shadow-lg ring-2 ring-indigo-200"
                            )}
                          >
                            <p className="text-sm font-semibold text-ink-primary">{lead.fullName}</p>
                            {lead.interest && (
                              <p className="text-xs text-ink-tertiary mt-1">{lead.interest}</p>
                            )}
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          ))}
        </div>
      </DragDropContext>

      {showCreateModal && (
        <LeadFormModal
          stages={stages}
          onClose={() => setShowCreateModal(false)}
          onCreated={handleLeadCreated}
        />
      )}

      {selectedLead && (
        <LeadDetailModal
          lead={selectedLead}
          onClose={() => setSelectedLead(null)}
        />
      )}
    </>
  );
}
