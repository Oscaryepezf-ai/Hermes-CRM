"use client";

import { useState, useCallback } from "react";
import { DragDropContext, type DropResult } from "@hello-pangea/dnd";
import { StageColumn } from "./StageColumn";
import { LeadFormModal } from "./LeadFormModal";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { updateLeadStatus } from "@/lib/actions/leads";
import { toast } from "sonner";
import type { LeadForBoard, LeadStatus } from "@/types/leads";
import type { LeadWithStage } from "@/types";

// ─── Stage config — pasteles médicos ─────────────────────────────────────────

interface StageConfig {
  status:      LeadStatus;
  label:       string;
  dotColor:    string;
  textColor:   string;
  bgColor:     string;
  headerColor: string;
  borderColor: string;
}

const STAGE_CONFIGS: StageConfig[] = [
  {
    status:      "NUEVO",
    label:       "Nuevo Lead",
    dotColor:    "#4A90E2",
    textColor:   "#1E4A8A",
    bgColor:     "#EEF3FC",
    headerColor: "#DDE8F8",
    borderColor: "#C8D9F4",
  },
  {
    status:      "CONTACTADO",
    label:       "Contactado",
    dotColor:    "#8B7CF6",
    textColor:   "#4A3B9E",
    bgColor:     "#F2EFFE",
    headerColor: "#E8E2FC",
    borderColor: "#D4CCFA",
  },
  {
    status:      "CITA_AGENDADA",
    label:       "Cita Agendada",
    dotColor:    "#34C47A",
    textColor:   "#15694A",
    bgColor:     "#EDFAF4",
    headerColor: "#D8F4E8",
    borderColor: "#B8EAD4",
  },
  {
    status:      "PRESUPUESTO_ENVIADO",
    label:       "Presupuesto",
    dotColor:    "#E8A528",
    textColor:   "#8A5C0A",
    bgColor:     "#FEF9EE",
    headerColor: "#FDF0D4",
    borderColor: "#F5DCAA",
  },
  {
    status:      "CONVERTIDO",
    label:       "Convertido",
    dotColor:    "#10B981",
    textColor:   "#065F46",
    bgColor:     "#EDFBF6",
    headerColor: "#D4F5E7",
    borderColor: "#A8EAD0",
  },
  {
    status:      "PERDIDO",
    label:       "Perdido",
    dotColor:    "#F47B8A",
    textColor:   "#9B2335",
    bgColor:     "#FEF2F4",
    headerColor: "#FDE2E7",
    borderColor: "#F8C4CC",
  },
];

// ─── Props ────────────────────────────────────────────────────────────────────

interface PipelineBoardProps {
  initialLeads:   LeadForBoard[];
  selectedLeadId: string | null;
  onSelectLead:   (id: string | null) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PipelineBoard({ initialLeads, selectedLeadId, onSelectLead }: PipelineBoardProps) {
  const [leads, setLeads]               = useState<LeadForBoard[]>(initialLeads);
  const [showCreateModal, setShowCreate] = useState(false);

  const getLeadsForStatus = useCallback(
    (status: LeadStatus) => leads.filter(l => l.status === status),
    [leads]
  );

  const onDragEnd = async (result: DropResult) => {
    const { draggableId, source, destination } = result;
    if (!destination || destination.droppableId === source.droppableId) return;

    const newStatus = destination.droppableId as LeadStatus;
    setLeads(prev => prev.map(l => l.id === draggableId ? { ...l, status: newStatus } : l));

    const res = await updateLeadStatus(draggableId, newStatus);
    if (!res.success) {
      setLeads(prev => prev.map(l =>
        l.id === draggableId ? { ...l, status: source.droppableId as LeadStatus } : l
      ));
      toast.error(res.error ?? "Error al mover el lead");
    } else {
      toast.success("Lead actualizado");
    }
  };

  const handleLeadCreated = (_lead: LeadWithStage) => {
    setShowCreate(false);
    window.location.reload();
  };

  const handleSelectLead = (id: string) => {
    onSelectLead(selectedLeadId === id ? null : id);
  };

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
        <div className="flex gap-4 overflow-x-auto p-5 h-full">
          {STAGE_CONFIGS.map(cfg => (
            <StageColumn
              key={cfg.status}
              droppableId={cfg.status}
              label={cfg.label}
              dotColor={cfg.dotColor}
              textColor={cfg.textColor}
              bgColor={cfg.bgColor}
              headerColor={cfg.headerColor}
              borderColor={cfg.borderColor}
              leads={getLeadsForStatus(cfg.status)}
              selectedLeadId={selectedLeadId}
              onSelectLead={handleSelectLead}
            />
          ))}
        </div>
      </DragDropContext>

      {showCreateModal && (
        <LeadFormModal
          stages={[]}
          onClose={() => setShowCreate(false)}
          onCreated={handleLeadCreated as () => void}
        />
      )}
    </>
  );
}
