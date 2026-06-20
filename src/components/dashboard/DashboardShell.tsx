"use client";

import { useState, useCallback } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { MobileNav } from "./MobileNav";
import { Toaster } from "@/components/ui/sonner";
import { AppointmentModal } from "@/components/agenda/AppointmentModal";
import { LeadFormModal } from "@/components/pipeline/LeadFormModal";
import { fetchClinicStages } from "@/lib/actions/stages";
import type { UserRole } from "@prisma/client";
import type { PipelineStage } from "@/types";

interface DashboardShellProps {
  children:     React.ReactNode;
  clinicName:   string;
  userName:     string;
  plan:         string;
  userRole:     UserRole;
  isSuperAdmin?: boolean;
}

// The sidebar width is tracked via CSS custom property --sidebar-w
// set directly by Sidebar.tsx. This avoids React re-renders in the
// content area (which would break @hello-pangea/dnd drag-and-drop).
export function DashboardShell({
  children, clinicName, userName, plan, userRole, isSuperAdmin = false,
}: DashboardShellProps) {
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [stages, setStages] = useState<PipelineStage[]>([]);

  const openCreatePatient = useCallback(() => {
    fetchClinicStages().then((res) => {
      if (res.success) setStages(res.data as unknown as PipelineStage[]);
      setShowLeadModal(true);
    });
  }, []);

  return (
    <div className="min-h-screen bg-canvas">
      <Sidebar userRole={userRole} plan={plan} isSuperAdmin={isSuperAdmin} />
      <div
        className="transition-[padding-left] duration-200 ease-in-out"
        style={{ paddingLeft: "var(--sidebar-w, 0px)" }}
      >
        <Header
          clinicName={clinicName}
          userName={userName}
          plan={plan}
          onCreateAppointment={() => setShowAppointmentModal(true)}
          onCreatePatient={openCreatePatient}
        />
        {/* pb-20 on mobile to clear the bottom nav bar */}
        <main className="p-3 md:p-6 pb-24 md:pb-6">{children}</main>
      </div>
      <MobileNav />
      <Toaster richColors position="top-right" />

      {showAppointmentModal && (
        <AppointmentModal mode="create" onClose={() => setShowAppointmentModal(false)} />
      )}

      {showLeadModal && (
        <LeadFormModal
          stages={stages}
          onClose={() => setShowLeadModal(false)}
          onCreated={() => setShowLeadModal(false)}
        />
      )}
    </div>
  );
}
