"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { Toaster } from "@/components/ui/sonner";
import type { UserRole } from "@prisma/client";

interface DashboardShellProps {
  children:   React.ReactNode;
  clinicName: string;
  userName:   string;
  plan:       string;
  userRole:   UserRole;
}

export function DashboardShell({
  children, clinicName, userName, plan, userRole,
}: DashboardShellProps) {
  const [collapsed, setCollapsed] = useState(false);

  // Sync with sidebar's own localStorage state
  useEffect(() => {
    const saved = localStorage.getItem("sidebar-collapsed");
    if (saved === "true") setCollapsed(true);

    // Listen for sidebar toggle via storage events (same tab)
    const onStorage = () => {
      const v = localStorage.getItem("sidebar-collapsed");
      setCollapsed(v === "true");
    };
    window.addEventListener("storage", onStorage);

    // Poll localStorage since storage event doesn't fire in same tab
    const interval = setInterval(() => {
      const v = localStorage.getItem("sidebar-collapsed");
      setCollapsed(v === "true");
    }, 150);

    return () => {
      window.removeEventListener("storage", onStorage);
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="min-h-screen bg-canvas">
      <Sidebar userRole={userRole} plan={plan} />
      <div
        className="transition-all duration-200 ease-in-out"
        style={{ paddingLeft: collapsed ? "60px" : "220px" }}
      >
        <Header clinicName={clinicName} userName={userName} plan={plan} />
        <main className="p-6">{children}</main>
      </div>
      <Toaster richColors position="top-right" />
    </div>
  );
}
