"use client";

import { signOut } from "next-auth/react";
import { Search } from "lucide-react";
import { usePathname } from "next/navigation";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { CreateButton } from "./CreateButton";
import { ClinicSwitcher } from "./ClinicSwitcher";

const ROUTE_LABELS: Record<string, string> = {
  "/dashboard":  "Inicio",
  "/pipeline":   "Pipeline",
  "/inbox":      "Bandeja de entrada",
  "/agenda":     "Agenda",
  "/patients":   "Pacientes",
  "/dr-clinic":  "Dr. Clinic",
  "/ai":         "Hermes AI",
  "/reportes":   "Reportes",
  "/crecimiento": "Crecimiento",
  "/settings":   "Ajustes",
};

interface HeaderProps {
  clinicName:     string;
  userName:       string;
  plan:           string;
  clinics:        { id: string; name: string }[];
  activeClinicId: string;
  onCreateAppointment: () => void;
  onCreatePatient: () => void;
}

export function Header({ clinicName, userName, clinics, activeClinicId, onCreateAppointment, onCreatePatient }: HeaderProps) {
  const pathname = usePathname();
  const initials = userName
    .split(" ")
    .map(n => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const pageLabel = Object.entries(ROUTE_LABELS).find(
    ([route]) => pathname.startsWith(route)
  )?.[1] ?? "Inicio";

  return (
    <header className="h-16 bg-canvas/95 backdrop-blur-md flex items-center justify-between px-3 md:px-6 sticky top-0 z-30">
      {/* Breadcrumb */}
      <nav className="flex items-center text-[13px] min-w-0" aria-label="Breadcrumb">
        <ClinicSwitcher clinicName={clinicName} clinics={clinics} activeClinicId={activeClinicId} />
        <span className="mx-1.5 text-ink-disabled hidden sm:block">/</span>
        <span className="font-semibold text-ink-primary">{pageLabel}</span>
      </nav>

      {/* Right actions */}
      <div className="flex items-center gap-2">
        <CreateButton onCreateAppointment={onCreateAppointment} onCreatePatient={onCreatePatient} />

        <button
          aria-label="Buscar"
          className="h-9 md:w-52 w-9 flex items-center md:justify-start justify-center gap-2 md:px-3.5 rounded-full bg-surface text-ink-tertiary hover:text-ink-secondary transition-ui text-[13px]"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          <Search className="w-4 h-4 flex-shrink-0" />
          <span className="hidden md:inline">Buscar…</span>
        </button>

        <ThemeToggle />

        <NotificationBell />

        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          aria-label="Cerrar sesión"
          title="Cerrar sesión"
          className="w-9 h-9 rounded-full bg-brand-gradient text-white flex items-center justify-center text-xs font-semibold hover:opacity-90 transition-ui"
        >
          {initials}
        </button>
      </div>
    </header>
  );
}
