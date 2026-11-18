"use client"

import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { cn } from "@/lib/utils"

export function ViewToggle({ view }: { view: "cohort" | "activity" }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const setView = (next: "cohort" | "activity") => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("view", next)
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="flex items-center gap-1 bg-inset rounded-[7px] p-0.5">
      {(["cohort", "activity"] as const).map((v) => (
        <button
          key={v}
          onClick={() => setView(v)}
          className={cn(
            "px-2.5 py-1 text-[12px] font-medium rounded-[6px] transition-colors",
            view === v ? "bg-surface text-ink-primary shadow-card" : "text-ink-tertiary hover:text-ink-secondary"
          )}
        >
          {v === "cohort" ? "Cohorte de captación" : "Actividad del periodo"}
        </button>
      ))}
    </div>
  )
}
