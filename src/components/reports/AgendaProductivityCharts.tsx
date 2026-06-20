"use client"

import { useTheme } from "next-themes"
import { useEffect, useState } from "react"
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const PIE_COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ec4899", "#14b8a6", "#f97316", "#8b5cf6", "#0ea5e9"]

type Props = {
  byDoctor: { name: string; hoursWorked: number; scheduled: number; attended: number }[]
  consultReasons: { label: string; count: number }[]
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

export function AgendaProductivityCharts({ byDoctor, consultReasons }: Props) {
  const t = useChartTheme()
  const tooltipStyle = { borderRadius: "8px", border: `1px solid ${t.tooltipBrd}`, fontSize: "12px", background: t.tooltipBg, color: t.tooltipTxt }

  const attendanceData = byDoctor.map((d) => ({
    name: d.name,
    pct: d.scheduled > 0 ? Math.round((d.attended / d.scheduled) * 100) : 0,
  }))

  return (
    <div className="grid grid-cols-2 gap-4">
      <Card className="bg-surface shadow-card border-line-subtle">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-ink-secondary">Horas trabajadas por doctor</CardTitle>
        </CardHeader>
        <CardContent>
          {byDoctor.length === 0 ? <EmptyState /> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={byDoctor} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={t.grid} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: t.tick }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: t.tick }} axisLine={false} tickLine={false} width={35} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: "11px" }} />
                <Bar dataKey="hoursWorked" name="Horas" fill="#6366f1" radius={[3, 3, 0, 0]} />
                <Bar dataKey="attended" name="Citas atendidas" fill="#10b981" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card className="bg-surface shadow-card border-line-subtle">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-ink-secondary">% Citas atendidas vs agendadas</CardTitle>
        </CardHeader>
        <CardContent>
          {attendanceData.length === 0 ? <EmptyState /> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={attendanceData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={t.grid} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: t.tick }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11, fill: t.tick }} axisLine={false} tickLine={false} width={40} />
                <Tooltip formatter={(v) => `${v}%`} contentStyle={tooltipStyle} />
                <Bar dataKey="pct" fill="#6366f1" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card className="bg-surface shadow-card border-line-subtle col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-ink-secondary">Motivos de consulta</CardTitle>
        </CardHeader>
        <CardContent>
          {consultReasons.length === 0 ? <EmptyState /> : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={consultReasons} dataKey="count" nameKey="label" cx="50%" cy="50%" outerRadius={85} label={(props) => props.name}>
                  {consultReasons.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function EmptyState() {
  return <p className="text-[12px] text-ink-disabled text-center py-12">Sin información en este período</p>
}
