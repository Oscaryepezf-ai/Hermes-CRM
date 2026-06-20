"use client";

import { signOut } from "next-auth/react";
import { Search } from "lucide-react";
import { usePathname } from "next/navigation";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { CreateButton } from "./CreateButton";

const ROUTE_LABELS: Record<string, string> = {
  "/dashboard":  "Dashboard",
  "/pipeline":   "Pipeline",
  "/inbox":      "Bandeja de entrada",
  "/agenda":     "Agenda",
  "/patients":   "Pacientes",
  "/dr-clinic":  "Dr. Clinic",
  "/ai":         "Hermes AI",
  "/settings":   "Ajustes",
};

interface HeaderProps {
  clinicName: string;
  userName:   string;
  plan:       string;
  onCreateAppointment: () => void;
  onCreatePatient: () => void;
}

export function Header({ clinicName, userName, onCreateAppointment, onCreatePatient }: HeaderProps) {
  const pathname = usePathname();
  const initials = userName
    .split(" ")
    .map(n => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const pageLabel = Object.entries(ROUTE_LABELS).find(
    ([route]) => pathname.startsWith(route)
  )?.[1] ?? "Dashboard";

  return (
    <header
      className="h-[52px] bg-surface border-b border-line-subtle flex items-center justify-between px-6 sticky top-0 z-30"
      style={{ boxShadow: "var(--shadow-topbar)" }}
    >
      {/* Breadcrumb */}
      <nav className="flex items-center text-[12px] min-w-0" aria-label="Breadcrumb">
        <span className="font-medium text-ink-tertiary hidden sm:block truncate max-w-[120px]">{clinicName}</span>
        <span className="mx-1.5 text-ink-disabled hidden sm:block">/</span>
        <span className="font-[550] text-ink-primary">{pageLabel}</span>
      </nav>

      {/* Right actions */}
      <div className="flex items-center gap-1.5">
        <CreateButton onCreateAppointment={onCreateAppointment} onCreatePatient={onCreatePatient} />

        <button
          aria-label="Buscar"
          className="w-7 h-7 flex items-center justify-center rounded-[7px] bg-inset text-ink-tertiary hover:text-ink-secondary transition-ui"
        >
          <Search className="w-3.5 h-3.5" />
        </button>

        <ThemeToggle />

        <NotificationBell />

        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          aria-label="Cerrar sesión"
          title="Cerrar sesión"
          className="w-7 h-7 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center text-[11px] font-[550] hover:bg-brand-200 transition-ui"
        >
          {initials}
        </button>
      </div>
    </header>
  );
}
