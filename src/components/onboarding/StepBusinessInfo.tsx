"use client"

import { useState } from "react"
import { Stethoscope, Sparkles, Building2, HelpCircle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { saveBusinessInfo } from "@/lib/actions/onboarding-wizard"
import { WizardProgress } from "./WizardProgress"
import type { PracticeType } from "@prisma/client"

const PRACTICE_TYPES: { value: PracticeType; label: string; icon: typeof Stethoscope }[] = [
  { value: "ODONTOLOGIA",              label: "Odontología general",      icon: Stethoscope },
  { value: "ORTODONCIA_ESPECIALIZADA", label: "Ortodoncia especializada", icon: Sparkles },
  { value: "RED_DENTAL",               label: "Red dental multi-sede",    icon: Building2 },
  { value: "OTRO",                     label: "Otro",                     icon: HelpCircle },
]

export function StepBusinessInfo({ onNext }: { onNext: () => void }) {
  const [businessName, setBusinessName] = useState("")
  const [practiceType, setPracticeType] = useState<PracticeType | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleNext() {
    if (!businessName.trim() || !practiceType) return
    setLoading(true)
    setError("")
    const res = await saveBusinessInfo({ businessName, practiceType })
    setLoading(false)
    if (!res.success) { setError(res.error ?? "Error al guardar"); return }
    onNext()
  }

  return (
    <div>
      <WizardProgress step={1} />
      <h1 className="text-xl font-bold text-gray-900 text-center mb-6">Datos de tu negocio</h1>

      <div className="space-y-1.5 mb-5">
        <Label htmlFor="businessName">Nombre comercial *</Label>
        <Input
          id="businessName"
          value={businessName}
          onChange={(e) => setBusinessName(e.target.value)}
          placeholder="Centro Dental Sonría"
        />
      </div>

      <div className="space-y-1.5 mb-6">
        <Label>Tipo de práctica *</Label>
        <div className="grid grid-cols-2 gap-3">
          {PRACTICE_TYPES.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => setPracticeType(value)}
              className={cn(
                "flex flex-col items-center gap-2 p-4 rounded-xl border-2 text-center transition-colors",
                practiceType === value ? "border-indigo-500 bg-indigo-50" : "border-gray-200 hover:border-gray-300"
              )}
            >
              <Icon className={cn("w-5 h-5", practiceType === value ? "text-indigo-600" : "text-gray-400")} />
              <span className="text-xs font-medium text-gray-700">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-4">{error}</p>}

      <Button
        className="w-full bg-indigo-600 hover:bg-indigo-700"
        disabled={!businessName.trim() || !practiceType || loading}
        onClick={handleNext}
      >
        {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
        Siguiente →
      </Button>
    </div>
  )
}
