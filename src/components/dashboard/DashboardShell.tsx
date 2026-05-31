"use client";

import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { Toaster } from "@/components/ui/sonner";
import type { UserRole } from "@prisma/client";

interface DashboardShellProps {
  children:   React.ReactNode;
  clinicName: string;
  userName:   string;
  plan:       string;
  userRole?:  UserRole;
}

export function DashboardShell({
  children,
  clinicName,
  userName,
  plan,
  userRole = "ADMIN",
}: DashboardShellProps) {
  return (
    <div className="min-h-screen bg-medical-bg">
      <Sidebar userRole={userRole} />
      <div className="pl-[220px]">
        <Header clinicName={clinicName} userName={userName} plan={plan} />
        <main className="p-6">{children}</main>
      </div>
      <Toaster richColors position="top-right" />
    </div>
  );
}
