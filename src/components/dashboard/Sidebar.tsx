"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Kanban,
  Users,
  Bot,
  Settings,
  Stethoscope,
  ChevronRight,
  CalendarDays,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Dashboard",  href: "/dashboard", icon: LayoutDashboard },
  { label: "Pipeline",   href: "/pipeline",  icon: Kanban },
  { label: "Agenda",     href: "/agenda",    icon: CalendarDays },
  { label: "Pacientes",  href: "/patients",  icon: Users },
  { label: "Dr. Clinic", href: "/dr-clinic", icon: Stethoscope },
  { label: "Hermes AI",  href: "/ai",        icon: Bot, badge: "Pro" },
  { label: "Ajustes",    href: "/settings",  icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 h-screen w-[220px] bg-medical-card border-r border-medical-border flex flex-col z-40 shadow-sm">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-4 border-b border-medical-border">
        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
          <Stethoscope className="w-4 h-4 text-white" />
        </div>
        <div className="min-w-0">
          <p className="font-bold text-gray-900 text-[13px] leading-tight truncate">
            Hermes Odontología
          </p>
          <p className="text-[11px] text-gray-400 leading-tight">CRM Dental</p>
        </div>
      </div>

      {/* Navegación */}
      <nav className="flex-1 px-2 py-3 space-y-0.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors relative",
                isActive
                  ? "bg-indigo-50 text-indigo-600 border-l-[3px] border-indigo-600 rounded-l-none pl-[9px]"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              <Icon
                className={cn(
                  "w-4 h-4 flex-shrink-0",
                  isActive ? "text-indigo-600" : "text-gray-400"
                )}
              />
              <span className="flex-1">{item.label}</span>
              {item.badge && (
                <span className="bg-amber-100 text-amber-700 text-[10px] font-semibold px-1.5 py-0.5 rounded-full">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer plan */}
      <div className="px-4 py-4 border-t border-medical-border space-y-2">
        <p className="text-xs text-gray-400">Plan Basic</p>
        <Link
          href="/pricing"
          className="flex items-center gap-1 text-xs text-indigo-600 font-medium hover:underline"
        >
          Ver Premium
          <ChevronRight className="w-3 h-3" />
        </Link>
      </div>
    </aside>
  );
}
