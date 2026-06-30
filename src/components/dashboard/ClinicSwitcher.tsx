"use client"

import { useState, useRef, useEffect, useTransition } from "react"
import { useRouter } from "next/navigation"
import { ChevronDown, Check, Loader2, Building2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { switchClinic } from "@/lib/actions/clinic-switch"

interface ClinicSwitcherProps {
  clinicName:     string
  clinics:        { id: string; name: string }[]
  activeClinicId: string
}

export function ClinicSwitcher({ clinicName, clinics, activeClinicId }: ClinicSwitcherProps) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const ref = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  function select(clinicId: string) {
    if (clinicId === activeClinicId) {
      setOpen(false)
      return
    }
    setOpen(false)
    startTransition(async () => {
      const result = await switchClinic(clinicId)
      if (result.success) router.refresh()
    })
  }

  if (clinics.length <= 1) {
    return <span className="font-medium text-ink-tertiary hidden sm:block truncate max-w-[120px]">{clinicName}</span>
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={isPending}
        className="font-medium text-ink-tertiary hidden sm:flex items-center gap-1 truncate max-w-[160px] hover:text-ink-secondary transition-ui"
      >
        {isPending ? <Loader2 className="w-3 h-3 animate-spin flex-shrink-0" /> : <Building2 className="w-3 h-3 flex-shrink-0" />}
        <span className="truncate">{clinicName}</span>
        <ChevronDown className="w-3 h-3 opacity-70 flex-shrink-0" />
      </button>

      {open && (
        <div className="absolute left-0 top-7 w-56 bg-popover rounded-xl shadow-xl ring-1 ring-foreground/10 z-50 overflow-hidden py-1">
          {clinics.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => select(c.id)}
              className={cn(
                "w-full flex items-center justify-between gap-2 px-3.5 py-2 text-[13px] font-medium hover:bg-inset transition-ui text-left",
                c.id === activeClinicId ? "text-brand-600" : "text-ink-primary"
              )}
            >
              <span className="truncate">{c.name}</span>
              {c.id === activeClinicId && <Check className="w-3.5 h-3.5 flex-shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
