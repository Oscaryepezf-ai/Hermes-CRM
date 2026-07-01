"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { CreditCard, Calendar, Users, Radio, Bot, Workflow, FlaskConical, Building2 } from "lucide-react"
import { cn } from "@/lib/utils"

const NAV_ITEMS = [
  { href: "/settings",           label: "Plan",        icon: CreditCard   },
  { href: "/settings/clinica",   label: "Mi clínica",  icon: Building2    },
  { href: "/settings/channels",  label: "Canales",     icon: Radio        },
  { href: "/settings/assistant", label: "Captador IA", icon: Bot          },
  { href: "/settings/flows",     label: "Flujos",      icon: Workflow     },
  { href: "/settings/calendar",  label: "Agendador",   icon: Calendar     },
  { href: "/settings/users",     label: "Equipo",      icon: Users        },
  { href: "/settings/simular",   label: "Simular",     icon: FlaskConical },
]

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[18px] font-bold text-ink-primary leading-tight">Ajustes</h1>
        <p className="text-[12px] text-ink-tertiary mt-0.5">Configura tu clínica, canales y equipo</p>
      </div>

      <div className="flex gap-6 items-start">
        {/* Settings sidebar nav */}
        <nav className="w-[180px] flex-shrink-0">
          <div className="bg-surface border border-line-subtle rounded-[12px] overflow-hidden shadow-card">
            {NAV_ITEMS.map((item, i) => {
              const Icon = item.icon
              // Exact match for /settings, prefix match for sub-pages
              const isActive = item.href === "/settings"
                ? pathname === "/settings"
                : pathname.startsWith(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2.5 px-3.5 py-2.5 text-[13px] font-medium transition-ui border-b border-line-subtle last:border-0",
                    isActive
                      ? "bg-brand-50 text-brand-600"
                      : "text-ink-secondary hover:bg-inset hover:text-ink-primary"
                  )}
                >
                  <Icon className={cn("w-4 h-4 flex-shrink-0", isActive ? "text-brand-500" : "text-ink-tertiary")} />
                  {item.label}
                </Link>
              )
            })}
          </div>
        </nav>

        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </div>
  )
}
