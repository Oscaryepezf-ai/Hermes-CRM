"use client"

import { useState, useRef, useEffect } from "react"
import { Plus, ChevronDown, CalendarPlus, UserPlus } from "lucide-react"
import { cn } from "@/lib/utils"

interface CreateButtonProps {
  onCreateAppointment: () => void
  onCreatePatient: () => void
}

export function CreateButton({ onCreateAppointment, onCreatePatient }: CreateButtonProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  function select(action: () => void) {
    setOpen(false)
    action()
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "h-7 pl-2.5 pr-2 rounded-full bg-brand-500 hover:bg-brand-600 text-white text-[12.5px] font-medium flex items-center gap-1 transition-ui"
        )}
        style={{ boxShadow: "0 1px 3px rgba(99,102,241,0.35)" }}
      >
        <Plus className="w-3.5 h-3.5" />
        Crear
        <ChevronDown className="w-3 h-3 opacity-80" />
      </button>

      {open && (
        <div className="absolute right-0 top-9 w-52 bg-popover rounded-xl shadow-xl ring-1 ring-foreground/10 z-50 overflow-hidden py-1">
          <button
            onClick={() => select(onCreateAppointment)}
            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[13px] font-medium text-ink-primary hover:bg-inset transition-ui text-left"
          >
            <CalendarPlus className="w-4 h-4 text-brand-500" />
            Agendar cita
          </button>
          <button
            onClick={() => select(onCreatePatient)}
            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[13px] font-medium text-ink-primary hover:bg-inset transition-ui text-left"
          >
            <UserPlus className="w-4 h-4 text-brand-500" />
            Agregar paciente
          </button>
        </div>
      )}
    </div>
  )
}
