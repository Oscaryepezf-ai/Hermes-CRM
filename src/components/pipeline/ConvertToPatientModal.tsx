"use client"

import { useState } from "react"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { CheckCircle2, Calendar } from "lucide-react"
import { convertLead } from "@/lib/actions/journey"
import { toast } from "sonner"

interface ConvertToPatientModalProps {
  leadId:    string
  leadName:  string
  leadPhone: string
  onClose:   () => void
  onSuccess: (patientId?: string) => void
}

function getInitials(name: string) {
  return name.split(" ").slice(0, 2).map(n => n[0]).join("").toUpperCase()
}

export function ConvertToPatientModal({
  leadId, leadName, leadPhone, onClose, onSuccess,
}: ConvertToPatientModalProps) {
  const [value, setValue]     = useState("")
  const [planNote, setPlanNote] = useState("")
  const [loading, setLoading] = useState(false)

  const handleConfirm = async () => {
    const numValue = parseFloat(value)
    if (!value || isNaN(numValue) || numValue < 0) {
      toast.error("Ingresa el valor del tratamiento")
      return
    }

    setLoading(true)
    const res = await convertLead({
      leadId,
      conversionValue: numValue,
      note: planNote || undefined,
    })

    if (res.success) {
      toast.success(
        `¡Paciente creado! +$${numValue.toLocaleString("es-CO")} USD registrados`
      )
      onSuccess("patientId" in res ? (res as any).patientId : undefined)
      onClose()
    } else {
      toast.error(res.error)
    }
    setLoading(false)
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-100 rounded-lg px-4 py-3 -mx-1 mb-2">
            <DialogTitle className="text-base text-green-800">
              ¡Convirtiendo a paciente!
            </DialogTitle>
            <p className="text-xs text-green-600 mt-0.5">
              Este lead se convertirá en paciente activo
            </p>
          </div>
        </DialogHeader>

        {/* Lead info */}
        <div className="flex items-center gap-3 py-1">
          <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-semibold text-sm flex-shrink-0">
            {getInitials(leadName)}
          </div>
          <div>
            <p className="font-medium text-sm text-gray-900">{leadName}</p>
            <p className="text-xs text-gray-500">{leadPhone}</p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Conversion value */}
          <div className="space-y-1.5">
            <Label>
              Valor del tratamiento cerrado (USD){" "}
              <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
              <Input
                type="number"
                min="0"
                step="50"
                placeholder="0"
                value={value}
                onChange={e => setValue(e.target.value)}
                className="pl-7 text-sm"
              />
            </div>
          </div>

          {/* Plan note */}
          <div className="space-y-1.5">
            <Label>Plan de tratamiento acordado</Label>
            <Textarea
              placeholder="Resumen del plan de tratamiento..."
              value={planNote}
              onChange={e => setPlanNote(e.target.value)}
              rows={3}
              className="resize-none text-sm"
            />
          </div>

          {/* Summary checklist */}
          <div className="bg-gray-50 rounded-lg p-3 space-y-2 text-xs text-gray-600">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
              <span>Se creará el perfil de Paciente</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
              <span>Se moverá a "Paciente activo" en el pipeline</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
              <span>Se registrará en el Reporte Analítico</span>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={loading || !value}
            className="bg-green-600 hover:bg-green-700"
          >
            {loading ? "Procesando..." : "Confirmar conversión"}
            {!loading && <CheckCircle2 className="w-4 h-4 ml-1.5" />}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
