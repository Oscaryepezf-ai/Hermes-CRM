"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { DollarSign, ShoppingBag, ClipboardCheck, CalendarDays, Users, BarChart3 } from "lucide-react"
import { cn } from "@/lib/utils"

const NAV_ITEMS = [
  { href: "/reportes/ingresos",             label: "Ingresos y Egresos",     icon: DollarSign },
  { href: "/reportes/servicios-vendidos",   label: "Servicios Vendidos",     icon: ShoppingBag },
  { href: "/reportes/servicios-terminados", label: "Servicios Terminados",   icon: ClipboardCheck },
  { href: "/reportes/agenda",               label: "Agenda",                 icon: CalendarDays },
  { href: "/reportes/pacientes",            label: "Pacientes",              icon: Users },
  { href: "/reportes/anual",                label: "Reporte Anual",          icon: BarChart3 },
]

export default function ReportesLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[18px] font-bold text-ink-primary leading-tight">Reportes</h1>
        <p className="text-[12px] text-ink-tertiary mt-0.5">Visibilidad financiera y operativa de tu clínica</p>
      </div>

      <div className="flex gap-6 items-start">
        <nav className="w-[200px] flex-shrink-0">
          <div className="bg-surface border border-line-subtle rounded-[12px] overflow-hidden shadow-card">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon
              const isActive = pathname.startsWith(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2.5 px-3.5 py-2.5 text-[13px] font-medium transition-ui border-b border-line-subtle last:border-0",
                    isActive ? "bg-brand-50 text-brand-600" : "text-ink-secondary hover:bg-inset hover:text-ink-primary"
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
