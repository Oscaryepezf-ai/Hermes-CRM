"use client"

import { useState } from "react"
import { FileText, LayoutGrid, Settings2, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { saveCurrentTools } from "@/lib/actions/onboarding-wizard"
import { WizardProgress } from "./WizardProgress"
import type { CurrentTools } from "@prisma/client"

const TOOLS: { value: CurrentTools; label: string; description: string; icon: typeof FileText }[] = [
  { value: "PAPEL",                  label: "Documentación en papel",         description: "Calendario físico, historias clínicas en papel, etc.", icon: FileText },
  { value: "HERRAMIENTAS_SUELTAS",   label: "Herramientas digitales sueltas", description: "Google Calendar, Excel, PDFs",                          icon: LayoutGrid },
  { value: "SOFTWARE_ESPECIALIZADO", label: "Software especializado de salud", description: "Ya uso un sistema para agendar, historias o facturación", icon: Settings2 },
]

export function StepCurrentTools({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const [tool, setTool] = useState<CurrentTools | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleNext() {
    if (!tool) return
    setLoading(true)
    setError("")
    const res = await saveCurrentTools({ currentTools: tool })
    setLoading(false)
    if (!res.success) { setError(res.error ?? "Error al guardar"); return }
    onNext()
  }

  return (
    <div>
      <WizardProgress step={3} />
      <h1 className="text-xl font-bold text-gray-900 text-center mb-6">¿Cómo manejas tu consultorio actualmente?</h1>

      <div className="space-y-3 mb-6">
        {TOOLS.map(({ value, label, description, icon: Icon }) => (
          <button
            key={value}
            type="button"
            onClick={() => setTool(value)}
            className={cn(
              "w-full flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-colors",
              tool === value ? "border-indigo-500 bg-indigo-50" : "border-gray-200 hover:border-gray-300"
            )}
          >
            <Icon className={cn("w-5 h-5 mt-0.5 flex-shrink-0", tool === value ? "text-indigo-600" : "text-gray-400")} />
            <div>
              <p className="text-sm font-semibold text-gray-800">{label}</p>
              <p className="text-xs text-gray-500">{description}</p>
            </div>
          </button>
        ))}
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-4">{error}</p>}

      <div className="flex gap-3">
        <Button variant="outline" className="flex-1" onClick={onBack}>← Volver</Button>
        <Button className="flex-1 bg-indigo-600 hover:bg-indigo-700" disabled={!tool || loading} onClick={handleNext}>
          {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          Siguiente →
        </Button>
      </div>
    </div>
  )
}
