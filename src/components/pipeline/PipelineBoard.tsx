"use client";

import { useState, useCallback } from "react";
import { DragDropContext, type DropResult } from "@hello-pangea/dnd";
import { StageColumn } from "./StageColumn";
import { LeadFormModal } from "./LeadFormModal";
import { Button } from "@/components/ui/button";
import { Plus, UserPlus, Phone, CalendarCheck, FileText, CheckCircle2, XCircle } from "lucide-react";
import { updateLeadStatus } from "@/lib/actions/leads";
import { toast } from "sonner";
import type { LeadForBoard, LeadStatus } from "@/types/leads";
import type { LeadWithStage } from "@/types";
import type { LucideIcon } from "lucide-react";

// ─── Stage config ──────────────────────────────────────────────────────────────

interface StageConfig {
  status: LeadStatus;
  label: string;
  icon: LucideIcon;
  bgColor: string;
  headerColor: string;
}

const STAGE_CONFIGS: StageConfig[] = [
  {
    status: "NUEVO",
    label: "Nuevo Lead",
    icon: UserPlus,
    bgColor: "bg-col-new",
    headerColor: "bg-col-new-hdr",
  },
  {
    status: "CONTACTADO",
    label: "Contactado",
    icon: Phone,
    bgColor: "bg-col-contact",
    headerColor: "bg-col-contact-hdr",
  },
  {
    status: "CITA_AGENDADA",
    label: "Cita Agendada",
    icon: CalendarCheck,
    bgColor: "bg-col-appt",
    headerColor: "bg-col-appt-hdr",
  },
  {
    status: "PRESUPUESTO_ENVIADO",
    label: "Presupuesto",
    icon: FileText,
    bgColor: "bg-col-budget",
    headerColor: "bg-col-budget-hdr",
  },
  {
    status: "CONVERTIDO",
    label: "Convertido",
    icon: CheckCircle2,
    bgColor: "bg-col-convert",
    headerColor: "bg-col-convert-hdr",
  },
  {
    status: "PERDIDO",
    label: "Perdido",
    icon: XCircle,
    bgColor: "bg-col-lost",
    headerColor: "bg-col-lost-hdr",
  },
];

// ─── Props ─────────────────────────────────────────────────────────────────────

interface PipelineBoardProps {
  initialLeads: LeadForBoard[];
  selectedLeadId: string | null;
  onSelectLead: (id: string | null) => void;
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function PipelineBoard({
  initialLeads,
  selectedLeadId,
  onSelectLead,
}: PipelineBoardProps) {
  const [leads, setLeads] = useState<LeadForBoard[]>(initialLeads);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const getLeadsForStatus = useCallback(
    (status: LeadStatus) => leads.filter((l) => l.status === status),
    [leads]
  );

  const onDragEnd = async (result: DropResult) => {
    const { draggableId, source, destination } = result;
    if (!destination || destination.droppableId === source.droppableId) return;

    const newStatus = destination.droppableId as LeadStatus;

    // Optimistic update
    setLeads((prev) =>
      prev.map((lead) =>
        lead.id === draggableId ? { ...lead, status: newStatus } : lead
      )
    );

    const res = await updateLeadStatus(draggableId, newStatus);

    if (!res.success) {
      // Revert on failure
      const originalStatus = source.droppableId as LeadStatus;
      setLeads((prev) =>
        prev.map((lead) =>
          lead.id === draggableId ? { ...lead, status: originalStatus } : lead
        )
      );
      toast.error(res.error ?? "Error al mover el lead");
    } else {
      toast.success("Lead actualizado");
    }
  };

  // DECISIÓN: recarga la página para re-fetch de leads tras crear uno nuevo
  const handleLeadCreated = (_newLead: LeadWithStage) => {
    setShowCreateModal(false);
    window.location.reload();
  };

  const handleSelectLead = (id: string) => {
    onSelectLead(selectedLeadId === id ? null : id);
  };

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-medical-border bg-medical-card">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Pipeline de Pacientes</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Seguimiento comercial en tiempo real
          </p>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          className="bg-indigo-600 hover:bg-indigo-700"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Nuevo Lead
        </Button>
      </div>

      {/* Board */}
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-4 overflow-x-auto p-6 h-full">
          {STAGE_CONFIGS.map((config) => (
            <StageColumn
              key={config.status}
              droppableId={config.status}
              label={config.label}
              icon={config.icon}
              bgColor={config.bgColor}
              headerColor={config.headerColor}
              leads={getLeadsForStatus(config.status)}
              selectedLeadId={selectedLeadId}
              onSelectLead={handleSelectLead}
            />
          ))}
        </div>
      </DragDropContext>

      {showCreateModal && (
        <LeadFormModal
          stages={[]}
          onClose={() => setShowCreateModal(false)}
          onCreated={handleLeadCreated as () => void}
        />
      )}
    </>
  );
}
