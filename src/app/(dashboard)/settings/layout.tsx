import Link from "next/link"
import { headers } from "next/headers"
import { CreditCard, Calendar, Users, Radio, Shield } from "lucide-react"

const NAV_ITEMS = [
  { href: "/settings",          label: "Plan",      icon: CreditCard, exact: true  },
  { href: "/settings/channels", label: "Canales",   icon: Radio,      exact: false },
  { href: "/settings/calendar", label: "Agendador", icon: Calendar,   exact: false },
  { href: "/settings/users",    label: "Equipo",    icon: Users,      exact: false },
]

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const headersList = await headers()
  const pathname = headersList.get("x-pathname") ?? ""

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-[18px] font-bold text-ink-primary leading-tight">Ajustes</h1>
        <p className="text-[12px] text-ink-tertiary mt-0.5">
          Configura tu clínica, canales y equipo
        </p>
      </div>

      <div className="flex gap-6 items-start">
        {/* Settings sidebar nav */}
        <nav className="w-[180px] flex-shrink-0">
          <div className="bg-surface border border-line-subtle rounded-[12px] overflow-hidden shadow-card">
            {NAV_ITEMS.map(item => {
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-2.5 px-3.5 py-2.5 text-[13px] font-medium text-ink-secondary hover:bg-inset hover:text-ink-primary transition-ui border-b border-line-subtle last:border-0"
                >
                  <Icon className="w-4 h-4 text-ink-tertiary flex-shrink-0" />
                  {item.label}
                </Link>
              )
            })}
          </div>
        </nav>

        {/* Page content */}
        <div className="flex-1 min-w-0">
          {children}
        </div>
      </div>
    </div>
  )
}
