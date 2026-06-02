"use client"

import { Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"
import { toggleNewPatientBadge } from "@/lib/actions/stages"
import { toast } from "sonner"

interface ConvertedBadgeProps {
  leadId: string
  active: boolean
  canEdit: boolean
  onToggle?: () => void
}

export function ConvertedBadge({ leadId, active, canEdit, onToggle }: ConvertedBadgeProps) {
  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!canEdit) return
    const res = await toggleNewPatientBadge(leadId)
    if (res.success) {
      onToggle?.()
    } else {
      toast.error(res.error)
    }
  }

  if (active) {
    return (
      <button
        onClick={handleClick}
        disabled={!canEdit}
        className={cn(
          "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold",
          "bg-gradient-to-r from-emerald-400 to-teal-500 text-white",
          canEdit && "hover:opacity-80 transition-opacity cursor-pointer",
          !canEdit && "cursor-default"
        )}
        title={canEdit ? "Quitar badge" : undefined}
      >
        <Sparkles className="w-2.5 h-2.5" />
        Paciente nuevo del mes
      </button>
    )
  }

  if (!canEdit) return null

  return (
    <button
      onClick={handleClick}
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border border-dashed border-emerald-300 text-emerald-600 hover:border-emerald-500 hover:bg-emerald-50 transition-colors"
    >
      <Sparkles className="w-2.5 h-2.5" />
      Marcar como nuevo
    </button>
  )
}
