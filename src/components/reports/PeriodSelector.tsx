"use client"

import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { format } from "date-fns"

type Props = { from: string; to: string }

function toISODate(d: Date) {
  return format(d, "yyyy-MM-dd")
}

export function PeriodSelector({ from, to }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const pushRange = (newFrom: string, newTo: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("from", newFrom)
    params.set("to", newTo)
    router.push(`${pathname}?${params.toString()}`)
  }

  const setRange = (start: Date, end: Date) => {
    pushRange(toISODate(start), toISODate(end))
  }

  const now = new Date()

  const presets = [
    { label: "Hoy", onClick: () => setRange(now, now) },
    {
      label: "Esta semana",
      onClick: () => {
        const start = new Date(now)
        start.setDate(now.getDate() - now.getDay())
        setRange(start, now)
      },
    },
    {
      label: "Este mes",
      onClick: () => setRange(new Date(now.getFullYear(), now.getMonth(), 1), new Date(now.getFullYear(), now.getMonth() + 1, 0)),
    },
    {
      label: "Este año",
      onClick: () => setRange(new Date(now.getFullYear(), 0, 1), new Date(now.getFullYear(), 11, 31)),
    },
  ]

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {presets.map((p) => (
        <button
          key={p.label}
          onClick={p.onClick}
          className="text-[12px] font-medium px-2.5 py-1 rounded-[6px] border border-line-soft text-ink-secondary hover:bg-inset transition-colors"
        >
          {p.label}
        </button>
      ))}
      <div className="flex items-center gap-1.5 ml-1">
        <input
          type="date"
          defaultValue={from}
          onChange={(e) => pushRange(e.target.value, to)}
          className="h-8 px-2 text-[12px] border border-line-soft rounded-[6px] bg-surface"
        />
        <span className="text-ink-disabled text-[12px]">—</span>
        <input
          type="date"
          defaultValue={to}
          onChange={(e) => pushRange(from, e.target.value)}
          className="h-8 px-2 text-[12px] border border-line-soft rounded-[6px] bg-surface"
        />
      </div>
    </div>
  )
}
