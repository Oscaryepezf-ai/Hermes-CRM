"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { PipelineBoard } from "./PipelineBoard";
import { LeadJourneyPanel } from "./LeadJourneyPanel";
import { cn } from "@/lib/utils";
import type { LeadForBoard } from "@/types/leads";
import type { UserRole } from "@prisma/client";

interface PipelineLayoutProps {
  initialLeads: LeadForBoard[];
  clinicName:   string;
  userRole:     UserRole;
}

export function PipelineLayout({ initialLeads, clinicName, userRole }: PipelineLayoutProps) {
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);

  const selectedLead = selectedLeadId
    ? initialLeads.find((l) => l.id === selectedLeadId) ?? null
    : null;

  return (
    <div className="flex h-full overflow-hidden">
      {/* Board — compresses when panel is open */}
      <div
        className={cn(
          "flex flex-col overflow-hidden transition-all duration-300",
          selectedLeadId ? "w-full md:w-[60%]" : "w-full"
        )}
      >
        <PipelineBoard
          initialLeads={initialLeads}
          selectedLeadId={selectedLeadId}
          onSelectLead={setSelectedLeadId}
        />
      </div>

      {/* Journey panel — slides in from right */}
      <AnimatePresence>
        {selectedLeadId && selectedLead && (
          <motion.div
            key={selectedLeadId}
            initial={{ x: "100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className={cn(
              "flex flex-col border-l border-medical-border bg-white",
              "fixed inset-0 z-50 md:static md:z-auto md:w-[40%]"
            )}
          >
            <LeadJourneyPanel
              leadId={selectedLeadId}
              leadName={selectedLead.fullName}
              leadPhone={selectedLead.phone}
              leadTreatment={selectedLead.treatment}
              clinicName={clinicName}
              userRole={userRole}
              onClose={() => setSelectedLeadId(null)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
