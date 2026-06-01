"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import {
  LayoutDashboard, Building2, Users, CreditCard,
  LogOut, ShieldCheck, Radio,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { ThemeToggle } from "@/components/ui/theme-toggle"

const NAV = [
  { href: "/super-admin",          label: "Overview",  icon: LayoutDashboard, exact: true  },
  { href: "/super-admin/clinics",  label: "Clínicas",  icon: Building2,       exact: false },
]

export function PlatformShell({ children, adminName }: { children: React.ReactNode; adminName: string }) {
  const pathname = usePathname()

  return (
    <div className="min-h-screen bg-canvas flex">
      {/* Sidebar */}
      <aside className="w-[220px] flex-shrink-0 bg-[#0F0F1A] flex flex-col fixed h-screen z-40">
        {/* Logo */}
        <div className="px-4 py-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-violet-600 rounded-[8px] flex items-center justify-center flex-shrink-0">
              <ShieldCheck className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-white font-semibold text-[13px] leading-tight">Hermes CRM</p>
              <p className="text-violet-400 text-[11px]">Super Admin</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-3 space-y-0.5">
          {NAV.map(item => {
            const Icon = item.icon
            const isActive = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2.5 px-2.5 py-2 rounded-[7px] text-[13px] font-medium transition-colors",
                  isActive
                    ? "bg-violet-600/20 text-violet-300"
                    : "text-white/60 hover:bg-white/5 hover:text-white/90"
                )}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {item.label}
              </Link>
            )
          })}

          {/* Back to clinic */}
          <div className="pt-3 mt-3 border-t border-white/10">
            <Link
              href="/dashboard"
              className="flex items-center gap-2.5 px-2.5 py-2 rounded-[7px] text-[13px] font-medium text-white/50 hover:bg-white/5 hover:text-white/80 transition-colors"
            >
              <Radio className="w-4 h-4 flex-shrink-0" />
              Ir a mi clínica
            </Link>
          </div>
        </nav>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-white/10">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-full bg-violet-600 flex items-center justify-center text-[11px] font-semibold text-white">
              {adminName.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-white text-[12px] font-medium truncate">{adminName}</p>
              <p className="text-violet-400 text-[10px]">Super Admin</p>
            </div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-[7px] text-[12px] text-white/50 hover:text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="pl-[220px] flex-1 min-h-screen">
        {/* Topbar */}
        <header className="h-[52px] bg-surface border-b border-line-subtle flex items-center justify-between px-6 sticky top-0 z-30">
          <div className="flex items-center gap-2 text-[12px]">
            <ShieldCheck className="w-3.5 h-3.5 text-violet-500" />
            <span className="font-[550] text-ink-primary">Panel de Control — Plataforma</span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <span className="text-[11px] font-medium px-2 py-1 rounded-[6px] bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">
              Super Admin
            </span>
          </div>
        </header>

        <main className="p-6">{children}</main>
      </div>
    </div>
  )
}
