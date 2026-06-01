"use client"

import { useState } from "react"
import Link from "next/link"
import { Building2, Users, ChevronRight, CheckCircle2, XCircle, Bot, MessageCircle, Camera } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"
import { cn } from "@/lib/utils"

const PLAN_CONFIG: Record<string, { label: string; bg: string; text: string; price: number }> = {
  STARTER:     { label: "Starter",     bg: "#F0F2F6", text: "#4A5568", price: 49  },
  PROFESIONAL: { label: "Profesional", bg: "#EEF2FF", text: "#4338CA", price: 129 },
  CLINICA:     { label: "Élite",        bg: "#FFFBEB", text: "#92400E", price: 500 },
}

type Clinic = {
  id: string
  name: string
  slug: string
  plan: string
  country: string
  createdAt: Date
  captadorActive: boolean
  messengerActive: boolean
  instagramActive: boolean
  users: {
    id: string; name: string; email: string; role: string
    isActive: boolean; lastLoginAt: Date | null; createdAt: Date; avatarUrl: string | null
  }[]
  _count: { leads: number; patients: number; appointments: number }
}

interface ClinicsTableProps {
  clinics: Clinic[]
}

export function ClinicsTable({ clinics }: ClinicsTableProps) {
  const [search, setSearch] = useState("")

  const filtered = clinics.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.slug.toLowerCase().includes(search.toLowerCase())
  )

  // Last activity = most recent lastLoginAt across all users
  const getLastActivity = (clinic: Clinic) => {
    const dates = clinic.users.map(u => u.lastLoginAt).filter(Boolean) as Date[]
    if (!dates.length) return null
    return new Date(Math.max(...dates.map(d => new Date(d).getTime())))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-[16px] font-bold text-ink-primary">
          Clínicas <span className="text-ink-tertiary font-normal text-[14px]">({filtered.length})</span>
        </h2>
        <input
          type="search"
          placeholder="Buscar clínica..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-48 text-[12px] border border-line-soft rounded-[8px] px-3 py-1.5 bg-surface text-ink-primary placeholder:text-ink-disabled focus:outline-none focus:border-brand-400"
        />
      </div>

      <div className="bg-surface border border-line-subtle rounded-[12px] overflow-hidden shadow-card">
        {/* Table header */}
        <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_80px] gap-0 px-4 py-2.5 border-b border-line-subtle bg-inset">
          {["Clínica", "Plan", "Usuarios", "Leads", "Última actividad", ""].map(h => (
            <p key={h} className="text-[11px] font-medium text-ink-tertiary uppercase tracking-[0.04em]">{h}</p>
          ))}
        </div>

        {/* Rows */}
        {filtered.map((clinic, i) => {
          const planCfg = PLAN_CONFIG[clinic.plan] ?? PLAN_CONFIG.STARTER
          const lastActivity = getLastActivity(clinic)
          const activeUsers = clinic.users.filter(u => u.isActive).length

          return (
            <Link
              key={clinic.id}
              href={`/super-admin/clinics/${clinic.id}`}
              className={cn(
                "grid grid-cols-[2fr_1fr_1fr_1fr_1fr_80px] gap-0 px-4 py-3 items-center",
                "hover:bg-inset transition-colors group",
                i < filtered.length - 1 && "border-b border-line-subtle"
              )}
            >
              {/* Name */}
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-[8px] bg-brand-100 flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-3.5 h-3.5 text-brand-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-[550] text-ink-primary truncate">{clinic.name}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[11px] text-ink-tertiary">{clinic.country}</span>
                    {clinic.captadorActive && <Bot className="w-3 h-3 text-violet-400" />}
                    {clinic.messengerActive && <MessageCircle className="w-3 h-3 text-blue-400" />}
                    {clinic.instagramActive && <Camera className="w-3 h-3 text-pink-400" />}
                  </div>
                </div>
              </div>

              {/* Plan */}
              <span
                className="text-[11px] font-medium px-2 py-0.5 rounded-[4px] w-fit"
                style={{ background: planCfg.bg, color: planCfg.text }}
              >
                {planCfg.label} · ${planCfg.price}/mes
              </span>

              {/* Users */}
              <div className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-ink-tertiary" />
                <span className="text-[13px] text-ink-secondary">{activeUsers}</span>
                {clinic.users.length > activeUsers && (
                  <span className="text-[11px] text-ink-disabled">/{clinic.users.length}</span>
                )}
              </div>

              {/* Leads */}
              <span className="text-[13px] text-ink-secondary">{clinic._count.leads}</span>

              {/* Last activity */}
              <span className="text-[12px] text-ink-tertiary">
                {lastActivity
                  ? formatDistanceToNow(lastActivity, { addSuffix: true, locale: es })
                  : "Sin actividad"}
              </span>

              {/* Arrow */}
              <ChevronRight className="w-4 h-4 text-ink-disabled group-hover:text-ink-secondary transition-colors" />
            </Link>
          )
        })}

        {filtered.length === 0 && (
          <div className="px-4 py-8 text-center text-[13px] text-ink-tertiary">
            No se encontraron clínicas
          </div>
        )}
      </div>
    </div>
  )
}
