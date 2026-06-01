"use client"

import { useState } from "react"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { ArrowRight, ChevronRight } from "lucide-react"
import { advanceLeadState, markLeadAsLost } from "@/lib/actions/journey"
import { STATE_CONFIG } from "@/lib/journey/state-machine"
import { toast } from "sonner"
import type { JourneyState, LostReason } from "@prisma/client"

const LOST_REASON_LABELS: Record<LostReason, string> = {
  PRECIO_ALTO:      "Precio fuera de su presupuesto",
  ELIGIO_OTRA:      "Eligió otra clínica",
  NO_RESPONDE:      "Dejó de responder",
  NO_NECESITA:      "Ya no necesita el tratamiento",
  MALA_EXPERIENCIA: "Tuvo un problema con la clínica",
  OTRO:             "Otro motivo",
}

interface StageTransitionModalProps {
  leadId:       string
  leadName:     string
  currentState: JourneyState
  toState:      JourneyState
  onClose:      () => void
  onSuccess:    () => void
}

export function StageTransitionModal({
  leadId, leadName, currentState, toState, onClose, onSuccess,
}: StageTransitionModalProps) {
  const [note, setNote]           = useState("")
  const [lostReason, setLostReason] = useState<LostReason | "">("")
  const [loading, setLoading]     = useState(false)

  const fromConfig = STATE_CONFIG[currentState]
  const toConfig   = STATE_CONFIG[toState]

  const handleConfirm = async () => {
    if (toState === "PERDIDO" && !lostReason) {
      toast.error("Selecciona el motivo de pérdida")
      return
    }

    setLoading(true)
    let res

    if (toState === "PERDIDO") {
      res = await markLeadAsLost({
        leadId,
        lostReason: lostReason as LostReason,
        note: note || undefined,
      })
    } else {
      res = await advanceLeadState(leadId, toState, note || undefined)
    }

    if (res.success) {
      toast.success(`Lead movido a "${toConfig.label}"`)
      onSuccess()
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
          <DialogTitle className="text-base">Cambiar estado del lead</DialogTitle>
        </DialogHeader>

        {/* State transition header */}
        <div className="flex items-center gap-2 py-2">
          <Badge className={fromConfig.color + " font-normal text-xs"}>
            {fromConfig.label}
          </Badge>
          <ArrowRight className="w-3.5 h-3.5 text-ink-tertiary flex-shrink-0" />
          <Badge className={toConfig.color + " font-normal text-xs"}>
            {toConfig.label}
          </Badge>
        </div>

        <p className="text-sm text-ink-secondary">
          <span className="font-medium">{leadName}</span> — {toConfig.nextAction}
        </p>

        <div className="space-y-4">
          {/* Lost reason — only for PERDIDO */}
          {toState === "PERDIDO" && (
            <div className="space-y-1.5">
              <Label>Motivo de pérdida <span className="text-red-500">*</span></Label>
              <Select value={lostReason} onValueChange={v => setLostReason(v as LostReason)}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar motivo..." />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(LOST_REASON_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Note */}
          <div className="space-y-1.5">
            <Label>
              {toState === "PERDIDO" ? "Nota adicional" : "Nota"}{" "}
              {toState !== "PERDIDO" && <span className="text-ink-tertiary text-xs">(opcional)</span>}
            </Label>
            <Textarea
              placeholder={
                toState === "EN_CONSULTA"
                  ? "¿El paciente ya está en el consultorio?"
                  : "Agrega un comentario..."
              }
              value={note}
              onChange={e => setNote(e.target.value)}
              rows={3}
              className="resize-none text-sm"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={loading}>
            {loading ? "Guardando..." : "Confirmar"}
            {!loading && <ChevronRight className="w-4 h-4 ml-1" />}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
