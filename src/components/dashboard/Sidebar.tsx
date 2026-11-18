"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Kanban, Users, Bot, Settings,
  Stethoscope, CalendarDays, ChevronRight, ChevronLeft,
  Star, ShieldCheck, Inbox, BarChart3, TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SIDEBAR_MODULES } from "@/lib/rbac/permissions";
import type { UserRole } from "@prisma/client";

const ALL_NAV_ITEMS = [
  { label: "Inicio",     href: "/dashboard", icon: LayoutDashboard, module: "dashboard"  },
  { label: "Pipeline",   href: "/pipeline",  icon: Kanban,          module: "pipeline"   },
  { label: "Bandeja",    href: "/inbox",     icon: Inbox,           module: "inbox"      },
  { label: "Agenda",     href: "/agenda",    icon: CalendarDays,    module: "agenda"     },
  { label: "Pacientes",  href: "/patients",  icon: Users,           module: "patients"   },
  { label: "Dr. Clinic", href: "/dr-clinic", icon: Stethoscope,     module: "dr_clinic"  },
  { label: "Hermes AI",  href: "/ai",        icon: Bot,             module: "hermes_ai", badge: "Pro" },
  { label: "Reportes",   href: "/reportes",  icon: BarChart3,       module: "reports"    },
  { label: "Crecimiento",href: "/crecimiento", icon: TrendingUp,    module: "ad_spend"   },
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

const W_COLLAPSED = "76px";
const W_EXPANDED  = "224px";

function applySidebarWidth(collapsed: boolean) {
  document.documentElement.style.setProperty("--sidebar-w", collapsed ? W_COLLAPSED : W_EXPANDED);
}

export function Sidebar({ userRole, plan = "STARTER", isSuperAdmin = false }: SidebarProps) {
  const pathname  = usePathname();
  // Rail de iconos por defecto; se respeta la preferencia guardada.
  const [collapsed, setCollapsed] = useState(true);
  const isCollapsedRef = useRef(true);

  useEffect(() => {
    const saved = localStorage.getItem("sidebar-collapsed");
    const isCollapsed = saved === null ? true : saved === "true";
    setCollapsed(isCollapsed);
    const apply = () => {
      if (window.innerWidth >= 768) applySidebarWidth(isCollapsedRef.current);
      else document.documentElement.style.setProperty("--sidebar-w", "0px");
    };
    isCollapsedRef.current = isCollapsed;
    apply();
    window.addEventListener("resize", apply);
    return () => window.removeEventListener("resize", apply);
  }, []);

  const toggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    isCollapsedRef.current = next;
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
        "fixed left-0 top-0 h-screen bg-surface flex-col z-40 transition-[width] duration-200 ease-out",
        "hidden md:flex",
        collapsed ? "w-[76px]" : "w-[224px]"
      )}
      style={{ boxShadow: "var(--shadow-sidebar)" }}
    >
      {/* Logo */}
      <div className={cn(
        "flex items-center h-[72px] flex-shrink-0",
        collapsed ? "justify-center" : "px-5 gap-3"
      )}>
        <div className="w-10 h-10 bg-brand-gradient rounded-xl flex items-center justify-center flex-shrink-0 shadow-brand">
          <span className="text-white text-base font-bold leading-none">H</span>
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="font-semibold text-ink-primary text-sm leading-tight">Hermes</p>
            <p className="text-[11px] text-ink-tertiary leading-tight">CRM Dental</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav
        className={cn("flex-1 py-2 space-y-1 overflow-y-auto scrollbar-thin", collapsed ? "px-3" : "px-3")}
        aria-label="Navegación principal"
      >
        {isSuperAdmin && (
          <Link
            href="/super-admin"
            title={collapsed ? "Super Admin" : undefined}
            aria-label="Super Admin"
            className={cn(
              "flex items-center rounded-xl transition-ui select-none h-11",
              "bg-violet-50 text-violet-600 hover:bg-violet-100",
              collapsed ? "justify-center" : "gap-3 px-3"
            )}
          >
            <ShieldCheck className="w-[18px] h-[18px] flex-shrink-0" />
            {!collapsed && <span className="flex-1 text-sm font-[550] leading-tight">Super Admin</span>}
          </Link>
        )}

        {navItems.map((item) => {
          const Icon     = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");

          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              aria-label={item.label}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "relative flex items-center rounded-xl transition-ui select-none h-11",
                collapsed ? "justify-center" : "gap-3 px-3",
                isActive
                  ? "bg-brand-50 text-brand-600"
                  : "text-ink-tertiary hover:bg-inset hover:text-ink-primary"
              )}
            >
              {/* Indicador lateral pegado al borde de la sidebar */}
              {isActive && (
                <span className="absolute -left-3 top-1/2 -translate-y-1/2 w-[3px] h-6 bg-brand-500 rounded-r-full" />
              )}

              <Icon className="w-[18px] h-[18px] flex-shrink-0" />

              {!collapsed && (
                <>
                  <span className={cn("flex-1 text-sm leading-tight", isActive ? "font-[550]" : "font-medium")}>
                    {item.label}
                  </span>
                  {item.badge && (
                    <span className="bg-amber-50 text-amber-700 text-[10px] font-semibold px-1.5 py-0.5 rounded-md">
                      {item.badge}
                    </span>
                  )}
                </>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Plan */}
      <div className={cn("flex-shrink-0 pb-4 pt-2", collapsed ? "px-3" : "px-4")}>
        <div
          title={collapsed ? `Plan ${planLabel}` : undefined}
          className={cn(
            "flex items-center justify-center gap-1.5 rounded-xl text-xs font-semibold",
            collapsed ? "h-9" : "h-10",
            isElite ? "bg-amber-50 text-amber-700" : isPro ? "bg-brand-50 text-brand-600" : "bg-inset text-ink-secondary"
          )}
        >
          {isElite && <Star className="w-3 h-3" />}
          {collapsed ? planLabel.slice(0, 3) : `Plan ${planLabel}`}
        </div>
        {!collapsed && !isPro && !isElite && (
          <Link
            href="/pricing"
            className="flex items-center justify-center gap-1 text-[11px] text-brand-600 font-medium hover:underline mt-2"
          >
            Mejorar plan <ChevronRight className="w-3 h-3" />
          </Link>
        )}
      </div>

      {/* Colapsar / expandir */}
      <button
        onClick={toggle}
        title={collapsed ? "Expandir menú" : "Colapsar menú"}
        aria-label={collapsed ? "Expandir menú" : "Colapsar menú"}
        className="absolute -right-3 top-[88px] w-6 h-6 bg-surface rounded-full flex items-center justify-center transition-ui hover:text-brand-600 text-ink-tertiary z-50"
        style={{ boxShadow: "var(--shadow-card)" }}
      >
        {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
      </button>
    </aside>
  );
}
