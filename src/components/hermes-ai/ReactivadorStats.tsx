"use client"

import { useEffect, useState } from "react"
import { Users, DollarSign, TrendingUp, Zap } from "lucide-react"
import { getReactivadorData } from "@/lib/actions/reactivador"

type Stats = {
  totalInactive:         number
  activeCampaigns:       number
  respondedThisMonth:    number
  convertedThisMonth:    number
  responseRate:          number
  totalRevenueRecovered: number
}

export function ReactivadorStats() {
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => {
    getReactivadorData().then(res => {
      if (res.success && res.data) setStats(res.data.stats)
    })
  }, [])

  const items = [
    {
      label: "Reactivados (30d)",
      value: stats?.respondedThisMonth ?? "—",
      icon:  Users,
      color: "text-indigo-600",
      bg:    "bg-indigo-50",
    },
    {
      label: "Ingreso recuperado",
      value: stats?.totalRevenueRecovered
        ? `$${(stats.totalRevenueRecovered / 1000).toFixed(1)}k`
        : "$0",
      icon:  DollarSign,
      color: "text-emerald-600",
      bg:    "bg-emerald-50",
    },
    {
      label: "Tasa de respuesta",
      value: stats ? `${stats.responseRate}%` : "—",
      icon:  TrendingUp,
      color: "text-blue-600",
      bg:    "bg-blue-50",
    },
    {
      label: "Campañas activas",
      value: stats?.activeCampaigns ?? "—",
      icon:  Zap,
      color: "text-amber-600",
      bg:    "bg-amber-50",
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-3">
      {items.map(item => (
        <div key={item.label} className="bg-canvas rounded-xl p-3 flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg ${item.bg} flex items-center justify-center flex-shrink-0`}>
            <item.icon className={`w-4 h-4 ${item.color}`} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-ink-primary leading-tight">{item.value}</p>
            <p className="text-[10px] text-ink-tertiary mt-0.5 truncate">{item.label}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
