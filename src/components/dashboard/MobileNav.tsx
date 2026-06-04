"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Kanban, Inbox,
  CalendarDays, Users, MoreHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/pipeline",  icon: Kanban,          label: "Pipeline"  },
  { href: "/inbox",     icon: Inbox,           label: "Bandeja"   },
  { href: "/agenda",    icon: CalendarDays,    label: "Agenda"    },
  { href: "/patients",  icon: Users,           label: "Pacientes" },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-surface border-t border-line-subtle safe-area-inset-bottom">
      <div className="flex">
        {ITEMS.map(({ href, icon: Icon, label }) => {
          const isActive = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 transition-colors",
                isActive
                  ? "text-brand-600"
                  : "text-ink-tertiary active:text-ink-secondary"
              )}
            >
              <Icon className={cn("w-5 h-5", isActive && "text-brand-500")} />
              <span className={cn(
                "text-[9px] font-medium",
                isActive ? "text-brand-600" : "text-ink-tertiary"
              )}>
                {label}
              </span>
              {isActive && (
                <span className="absolute bottom-0 w-6 h-[2px] bg-brand-500 rounded-full" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
