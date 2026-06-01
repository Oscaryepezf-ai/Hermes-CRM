"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Kanban, Users, Bot, Settings,
  Stethoscope, CalendarDays, ChevronRight, ChevronLeft,
  Star, ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SIDEBAR_MODULES } from "@/lib/rbac/permissions";
import type { UserRole } from "@prisma/client";

const ALL_NAV_ITEMS = [
  { label: "Dashboard",  href: "/dashboard", icon: LayoutDashboard, module: "dashboard"  },
  { label: "Pipeline",   href: "/pipeline",  icon: Kanban,          module: "pipeline"   },
  { label: "Agenda",     href: "/agenda",    icon: CalendarDays,    module: "agenda"     },
  { label: "Pacientes",  href: "/patients",  icon: Users,           module: "patients"   },
  { label: "Dr. Clinic", href: "/dr-clinic", icon: Stethoscope,     module: "dr_clinic"  },
  { label: "Hermes AI",  href: "/ai",        icon: Bot,             module: "hermes_ai", badge: "Pro" },
  { label: "Ajustes",    href: "/settings",  icon: Settings,        module: "settings"   },
];

const PLAN_LABELS: Record<string, string> = {
  STARTER: "Basic", PROFESIONAL: "Pro", CLINICA: "Élite",
};

interface SidebarProps {
  userRole:     UserRole;
  plan?:        string;
  isSuperAdmin?: boolean;
}

function applySidebarWidth(collapsed: boolean) {
  document.documentElement.style.setProperty("--sidebar-w", collapsed ? "60px" : "220px");
}

export function Sidebar({ userRole, plan = "STARTER", isSuperAdmin = false }: SidebarProps) {
  const pathname  = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  // Initialize from localStorage and set CSS variable — no polling, no re-renders in parent
  useEffect(() => {
    const saved = localStorage.getItem("sidebar-collapsed") === "true";
    if (saved) {
      setCollapsed(true);
      applySidebarWidth(true);
    }
  }, []);

  const toggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem("sidebar-collapsed", String(next));
    applySidebarWidth(next);
  };

  const allowedModules = SIDEBAR_MODULES[userRole] ?? [];
  const navItems = ALL_NAV_ITEMS.filter(item => allowedModules.includes(item.module));

  const planLabel = PLAN_LABELS[plan] ?? "Basic";
  const isPro     = plan === "PROFESIONAL";
  const isElite   = plan === "CLINICA";

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 h-screen bg-surface border-r border-line-subtle flex flex-col z-40 transition-all duration-200 ease-in-out",
        collapsed ? "w-[60px]" : "w-[220px]"
      )}
      style={{ boxShadow: "var(--shadow-sidebar)" }}
    >
      {/* Logo */}
      <div className={cn(
        "flex items-center border-b border-line-subtle",
        collapsed ? "px-3 py-4 justify-center" : "px-4 py-4 gap-2.5"
      )}>
        <div className="w-8 h-8 bg-brand-500 rounded-[8px] flex items-center justify-center flex-shrink-0">
          <span className="text-white text-sm font-bold leading-none">H</span>
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="font-semibold text-ink-primary text-[13px] leading-tight">Hermes</p>
            <p className="text-[11px] text-ink-tertiary leading-tight">CRM Dental</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto scrollbar-thin">
        {/* Super Admin shortcut */}
        {isSuperAdmin && (
          <Link
            href="/super-admin"
            title={collapsed ? "Super Admin" : undefined}
            className={cn(
              "relative flex items-center rounded-[7px] transition-ui cursor-pointer select-none",
              "bg-violet-600/10 text-violet-600 hover:bg-violet-600/20",
              collapsed ? "justify-center px-0 py-2.5 mx-0" : "gap-3 px-2.5 py-2 mx-0"
            )}
          >
            <ShieldCheck className="w-4 h-4 flex-shrink-0 text-violet-500" />
            {!collapsed && (
              <span className="flex-1 text-sm font-[550] leading-tight">Super Admin</span>
            )}
          </Link>
        )}

        {navItems.map((item) => {
          const Icon    = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");

          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={cn(
                "relative flex items-center rounded-[7px] transition-ui cursor-pointer select-none",
                collapsed ? "justify-center px-0 py-2.5 mx-0" : "gap-3 px-2.5 py-2 mx-0",
                isActive
                  ? "bg-brand-50 text-brand-600"
                  : "text-ink-secondary hover:bg-inset hover:text-ink-primary"
              )}
            >
              {/* Active indicator bar */}
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[18px] bg-brand-500 rounded-r-full" />
              )}

              <Icon className={cn(
                "w-4 h-4 flex-shrink-0",
                isActive ? "text-brand-500" : "text-ink-tertiary"
              )} />

              {!collapsed && (
                <>
                  <span className={cn(
                    "flex-1 text-sm leading-tight",
                    isActive ? "font-[550] text-brand-700" : "font-medium"
                  )}>
                    {item.label}
                  </span>
                  {item.badge && (
                    <span className="bg-amber-50 text-amber-700 text-[10px] font-medium px-1.5 py-0.5 rounded-[6px]">
                      {item.badge}
                    </span>
                  )}
                </>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer plan */}
      {!collapsed && (
        <div className="px-4 py-3 border-t border-line-subtle">
          <div className={cn(
            "flex items-center gap-1.5 px-2.5 py-1.5 rounded-[7px] text-xs font-medium",
            isElite ? "bg-amber-50 text-amber-700" : isPro ? "bg-brand-50 text-brand-600" : "bg-inset text-ink-secondary"
          )}>
            {isElite && <Star className="w-3 h-3" />}
            {planLabel}
          </div>
          {!isPro && !isElite && (
            <Link
              href="/pricing"
              className="flex items-center gap-1 text-[11px] text-brand-600 font-medium hover:underline mt-1.5 px-2.5"
            >
              Upgrade <ChevronRight className="w-3 h-3" />
            </Link>
          )}
        </div>
      )}

      {/* Collapse toggle */}
      <button
        onClick={toggle}
        title={collapsed ? "Expandir sidebar" : "Colapsar sidebar"}
        className="absolute -right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 bg-surface border border-line-soft rounded-full flex items-center justify-center transition-ui hover:border-line-medium shadow-card z-50"
        style={{ boxShadow: "var(--shadow-card)" }}
      >
        {collapsed
          ? <ChevronRight className="w-2.5 h-2.5 text-ink-tertiary" />
          : <ChevronLeft  className="w-2.5 h-2.5 text-ink-tertiary" />
        }
      </button>
    </aside>
  );
}
