"use client"

import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CHANNEL_CONFIG } from "@/components/pipeline/ChannelBadge"
import type { MarketingChannel } from "@prisma/client"

const ALL_CHANNELS: MarketingChannel[] = ["FACEBOOK", "INSTAGRAM", "WHATSAPP", "GOOGLE", "REFERIDO", "TIKTOK", "OTRO"]

type Props = {
  year: number
  totalPatients: number
  distribution: { label: string; count: number }[]
  monthlyComparison: Record<string, string | number>[]
  selectedChannels: MarketingChannel[]
}

function useChartTheme() {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const dark = mounted && resolvedTheme === "dark"
  return {
    grid: dark ? "#232736" : "#f1f5f9",
    tick: dark ? "#5C6680" : "#94a3b8",
    tooltipBg: dark ? "#1A1D27" : "#ffffff",
    tooltipBrd: dark ? "#2A2F42" : "#e2e8f0",
    tooltipTxt: dark ? "#F0F2F8" : "#1A1D23",
  }
}

export function PatientAcquisitionPanel({ year, totalPatients, distribution, monthlyComparison, selectedChannels }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const t = useChartTheme()
  const tooltipStyle = { borderRadius: "8px", border: `1px solid ${t.tooltipBrd}`, fontSize: "12px", background: t.tooltipBg, color: t.tooltipTxt }

  const updateParams = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set(key, value)
    router.push(`${pathname}?${params.toString()}`)
  }

  const toggleChannel = (channel: MarketingChannel) => {
    const next = selectedChannels.includes(channel)
      ? selectedChannels.filter((c) => c !== channel)
      : [...selectedChannels, channel]
    updateParams("channels", next.join(","))
  }

  const years = [year - 1, year, year + 1]

  return (
    <div className="grid grid-cols-2 gap-4">
      <Card className="bg-surface shadow-card border-line-subtle">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-ink-secondary">
            Distribución — <span className="text-ink-primary">{totalPatients} pacientes</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {distribution.length === 0 ? (
            <p className="text-[12px] text-ink-disabled text-center py-12">Sin información</p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={distribution} dataKey="count" nameKey="label" cx="50%" cy="50%" outerRadius={75}>
                    {distribution.map((d) => (
                      <Cell key={d.label} fill={CHANNEL_CONFIG[d.label as MarketingChannel]?.dot ?? "#94A3B8"} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-1.5 mt-2">
                {distribution.map((d) => {
                  const cfg = CHANNEL_CONFIG[d.label as MarketingChannel]
                  return (
                    <div key={d.label} className="flex items-center gap-1.5 text-[12px] text-ink-secondary">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: cfg?.dot ?? "#94A3B8" }} />
                      {cfg?.label ?? d.label} ({d.count})
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card className="bg-surface shadow-card border-line-subtle">
        <CardHeader className="pb-2 space-y-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-ink-secondary">Comparación de fuentes</CardTitle>
            <select
              value={year}
              onChange={(e) => updateParams("year", e.target.value)}
              className="h-7 px-2 text-[12px] border border-line-soft rounded-[6px] bg-surface"
            >
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {ALL_CHANNELS.map((c) => {
              const active = selectedChannels.includes(c)
              const cfg = CHANNEL_CONFIG[c]
              return (
                <button
                  key={c}
                  onClick={() => toggleChannel(c)}
                  className="text-[10.5px] font-medium px-2 py-0.5 rounded-full border transition-colors"
                  style={active
                    ? { background: cfg.bgColor, color: cfg.textColor, borderColor: cfg.dot }
                    : { background: "transparent", color: "var(--color-ink-disabled)", borderColor: "var(--color-line-soft)" }}
                >
                  {cfg.label}
                </button>
              )
            })}
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={190}>
            <BarChart data={monthlyComparison} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={t.grid} />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: t.tick }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: t.tick }} axisLine={false} tickLine={false} width={30} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: "10px" }} />
              {selectedChannels.map((c) => (
                <Bar key={c} dataKey={c} name={CHANNEL_CONFIG[c].label} fill={CHANNEL_CONFIG[c].dot} radius={[3, 3, 0, 0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}
