"use client";

import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { Toaster } from "@/components/ui/sonner";

interface DashboardShellProps {
  children:   React.ReactNode;
  clinicName: string;
  userName:   string;
  plan:       string;
}

export function DashboardShell({
  children,
  clinicName,
  userName,
  plan,
}: DashboardShellProps) {
  return (
    <div className="min-h-screen bg-medical-bg">
      <Sidebar />
      <div className="pl-[220px]">
        <Header clinicName={clinicName} userName={userName} plan={plan} />
        <main className="p-6">{children}</main>
      </div>
      <Toaster richColors position="top-right" />
    </div>
  );
}
