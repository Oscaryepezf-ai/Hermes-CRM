"use client";

import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { Toaster } from "@/components/ui/sonner";
import type { UserRole } from "@prisma/client";

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
  return (
    <div className="min-h-screen bg-canvas">
      <Sidebar userRole={userRole} plan={plan} isSuperAdmin={isSuperAdmin} />
      <div
        className="transition-[padding-left] duration-200 ease-in-out"
        style={{ paddingLeft: "var(--sidebar-w, 220px)" }}
      >
        <Header clinicName={clinicName} userName={userName} plan={plan} />
        <main className="p-6">{children}</main>
      </div>
      <Toaster richColors position="top-right" />
    </div>
  );
}
