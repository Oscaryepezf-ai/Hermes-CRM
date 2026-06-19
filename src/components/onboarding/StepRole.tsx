"use client"

import { useState } from "react"
import { Home, Briefcase, UserCog, Building2, GraduationCap, Plus, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { saveSelfReportedRole } from "@/lib/actions/onboarding-wizard"
import { WizardProgress } from "./WizardProgress"
import type { SelfReportedRole } from "@prisma/client"

const ROLES: { value: SelfReportedRole; label: string; description: string; icon: typeof Home }[] = [
  { value: "DUENO_CONSULTORIO",     label: "Dueño del consultorio", description: "Soy dueño y atiendo pacientes",   icon: Home },
  { value: "ADMINISTRADOR",         label: "Administrador",         description: "Gestiono finanzas y operación",  icon: Briefcase },
  { value: "RECEPCIONISTA",         label: "Recepcionista",         description: "Agendo citas y recibo pacientes", icon: UserCog },
  { value: "PROFESIONAL_MULTISEDE", label: "Multi-sede",            description: "Atiendo en más de una clínica",  icon: Building2 },
  { value: "ESTUDIANTE",            label: "Estudiante",            description: "En prácticas",                   icon: GraduationCap },
  { value: "OTRO",                  label: "Otro",                  description: "",                                icon: Plus },
]

export function StepRole({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const [role, setRole] = useState<SelfReportedRole | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleNext() {
    if (!role) return
    setLoading(true)
    setError("")
    const res = await saveSelfReportedRole({ role })
    setLoading(false)
    if (!res.success) { setError(res.error ?? "Error al guardar"); return }
    onNext()
  }

  return (
    <div>
      <WizardProgress step={2} />
      <h1 className="text-xl font-bold text-gray-900 text-center">¿Cuál es tu rol?</h1>
      <p className="text-sm text-gray-500 text-center mb-6">Queremos personalizar tu experiencia</p>

      <div className="grid grid-cols-2 gap-3 mb-6">
        {ROLES.map(({ value, label, description, icon: Icon }) => (
          <button
            key={value}
            type="button"
            onClick={() => setRole(value)}
            className={cn(
              "flex flex-col items-start gap-1.5 p-3.5 rounded-xl border-2 text-left transition-colors",
              role === value ? "border-indigo-500 bg-indigo-50" : "border-gray-200 hover:border-gray-300"
            )}
          >
            <Icon className={cn("w-4.5 h-4.5", role === value ? "text-indigo-600" : "text-gray-400")} />
            <span className="text-xs font-semibold text-gray-800">{label}</span>
            {description && <span className="text-[11px] text-gray-500 leading-tight">{description}</span>}
          </button>
        ))}
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-4">{error}</p>}

      <div className="flex gap-3">
        <Button variant="outline" className="flex-1" onClick={onBack}>← Volver</Button>
        <Button className="flex-1 bg-indigo-600 hover:bg-indigo-700" disabled={!role || loading} onClick={handleNext}>
          {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          Siguiente →
        </Button>
      </div>
    </div>
  )
}
