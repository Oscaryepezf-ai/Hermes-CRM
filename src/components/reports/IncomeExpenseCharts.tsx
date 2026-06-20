"use client"

import { useTheme } from "next-themes"
import { useEffect, useState } from "react"
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency } from "@/lib/utils"

const PIE_COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ec4899", "#14b8a6", "#f97316"]

type Props = {
  totalIncome: number
  totalExpenses: number
  dailySeries: { date: string; ingreso: number; egreso: number }[]
  byDoctor: { name: string; total: number }[]
  byReceiptType: { label: string; value: number }[]
  byPaymentMethod: { label: string; value: number }[]
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

function formatValue(value: number) {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`
  return `$${value}`
}

export function IncomeExpenseCharts({ totalIncome, totalExpenses, dailySeries, byDoctor, byReceiptType, byPaymentMethod }: Props) {
  const t = useChartTheme()
  const tooltipStyle = { borderRadius: "8px", border: `1px solid ${t.tooltipBrd}`, fontSize: "12px", background: t.tooltipBg, color: t.tooltipTxt }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-surface shadow-card border-line-subtle">
          <CardContent className="pt-5">
            <p className="text-[12px] text-ink-tertiary">Ingresos del período</p>
            <p className="text-[26px] font-bold text-ink-primary tabular-nums mt-1">{formatCurrency(totalIncome)}</p>
          </CardContent>
        </Card>
        <Card className="bg-surface shadow-card border-line-subtle">
          <CardContent className="pt-5">
            <p className="text-[12px] text-ink-tertiary">Egresos del período</p>
            <p className="text-[26px] font-bold text-red-500 tabular-nums mt-1">{formatCurrency(totalExpenses)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-surface shadow-card border-line-subtle">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-ink-secondary">Ingresos y Egresos</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={dailySeries} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={t.grid} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: t.tick }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={formatValue} tick={{ fontSize: 11, fill: t.tick }} axisLine={false} tickLine={false} width={45} />
                <Tooltip formatter={(v) => formatCurrency(Number(v))} contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: "11px" }} />
                <Bar dataKey="ingreso" fill="#6366f1" radius={[3, 3, 0, 0]} />
                <Bar dataKey="egreso" fill="#f87171" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-surface shadow-card border-line-subtle">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-ink-secondary">Ingreso por doctor</CardTitle>
          </CardHeader>
          <CardContent>
            {byDoctor.length === 0 ? (
              <EmptyState />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={byDoctor} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={t.grid} />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: t.tick }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={formatValue} tick={{ fontSize: 11, fill: t.tick }} axisLine={false} tickLine={false} width={45} />
                  <Tooltip formatter={(v) => formatCurrency(Number(v))} contentStyle={tooltipStyle} />
                  <Bar dataKey="total" fill="#6366f1" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <PieCard title="Por tipo de comprobante" data={byReceiptType} tooltipStyle={tooltipStyle} />
        <PieCard title="Por medio de pago" data={byPaymentMethod} tooltipStyle={tooltipStyle} />
      </div>
    </div>
  )
}

function PieCard({ title, data, tooltipStyle }: { title: string; data: { label: string; value: number }[]; tooltipStyle: object }) {
  return (
    <Card className="bg-surface shadow-card border-line-subtle">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-ink-secondary">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <EmptyState />
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={data} dataKey="value" nameKey="label" cx="50%" cy="50%" outerRadius={70} label={(props) => props.name}>
                {data.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => formatCurrency(Number(v))} contentStyle={tooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}

function EmptyState() {
  return <p className="text-[12px] text-ink-disabled text-center py-12">Sin información en este período</p>
}
