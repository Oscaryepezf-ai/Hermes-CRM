"use client"

import { useState, useTransition } from "react"
import { ArrowLeft, Users, Send, CheckCircle2, AlertCircle } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import type { WaTemplate } from "@prisma/client"
import type { TemplateButton } from "@/lib/actions/wa-templates"

type Stage = { id: string; name: string }

interface Props {
  template: WaTemplate
  stages:   Stage[]
  onDone:   () => void
}

// Campos del lead que se pueden mapear a variables
const LEAD_FIELDS = [
  { value: "fullName",  label: "Nombre completo" },
  { value: "firstName", label: "Primer nombre"   },
  { value: "phone",     label: "Teléfono"        },
  { value: "email",     label: "Email"            },
  { value: "interest",  label: "Tratamiento de interés" },
]

export function CampaignCreator({ template, stages, onDone }: Props) {
  const [isPending, startTransition] = useTransition()

  const [campaignName, setCampaignName]  = useState(`${template.name} — ${new Date().toLocaleDateString("es-EC")}`)
  const [targetAll,    setTargetAll]     = useState(false)
  const [stageIds,     setStageIds]      = useState<string[]>([])
  const [variableMap,  setVariableMap]   = useState<Record<string, string>>({})
  const [step,         setStep]          = useState<"config" | "confirm" | "done">("config")
  const [result,       setResult]        = useState<{ sent: number; failed: number } | null>(null)

  const buttons: TemplateButton[] = Array.isArray(template.buttons) ? template.buttons as TemplateButton[] : []

  // Count body variables
  const varMatches = (template.body.match(/\{\{(\d+)\}\}/g) ?? [])
  const varIndices = [...new Set(varMatches.map(m => m.replace(/\{\{|\}\}/g, "")))]

  function toggleStage(id: string) {
    setStageIds(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id])
  }

  async function handleSend() {
    if (!targetAll && stageIds.length === 0) {
      toast.error("Selecciona al menos una etapa o elige 'Todos los leads'")
      return
    }
    if (!campaignName.trim()) {
      toast.error("El nombre de la campaña es obligatorio")
      return
    }

    startTransition(async () => {
      try {
        const res = await fetch("/api/campaigns/wa", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            templateId:   template.id,
            name:         campaignName,
            targetFilter: { all: targetAll, stageIds },
            variableMap,
          }),
        })
        const data = await res.json()
        if (!res.ok) {
          toast.error(data.error ?? "Error al crear la campaña")
          return
        }
        setResult({ sent: data.sent ?? 0, failed: data.failed ?? 0 })
        setStep("done")
      } catch (err) {
        toast.error("Error de conexión")
      }
    })
  }

  if (step === "done") {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
        <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
          <CheckCircle2 className="w-7 h-7 text-green-600" />
        </div>
        <h3 className="text-[16px] font-bold text-ink-primary">¡Campaña enviada!</h3>
        {result && (
          <p className="text-[13px] text-ink-secondary">
            <span className="text-green-600 font-semibold">{result.sent} mensajes enviados</span>
            {result.failed > 0 && <span className="text-red-500 ml-2">· {result.failed} fallidos</span>}
          </p>
        )}
        <p className="text-[12px] text-ink-tertiary max-w-sm">
          Los mensajes se están procesando. Los que fallen aparecerán en el historial con el motivo del error.
        </p>
        <button
          onClick={onDone}
          className="mt-2 px-5 py-2.5 bg-brand-600 text-white text-[13px] font-semibold rounded-xl hover:bg-brand-700 transition-ui"
        >
          Volver a plantillas
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-5 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onDone}
          className="p-1.5 rounded-lg hover:bg-inset text-ink-tertiary hover:text-ink-primary transition-ui"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h2 className="text-[15px] font-semibold text-ink-primary">Crear campaña</h2>
          <p className="text-[12px] text-ink-tertiary font-mono">{template.name}</p>
        </div>
      </div>

      {/* Warning */}
      <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
        <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
        <p className="text-[12px] text-amber-800">
          Solo se enviará a contactos con número de WhatsApp válido. Asegúrate de que los destinatarios dieron su consentimiento (opt-in) para recibir mensajes de marketing.
        </p>
      </div>

      {/* Nombre campaña */}
      <div>
        <label className="block text-[12px] font-semibold text-ink-secondary mb-1.5">Nombre de la campaña</label>
        <input
          value={campaignName}
          onChange={e => setCampaignName(e.target.value)}
          className="w-full text-[13px] px-3 py-2 bg-canvas border border-line-subtle rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-300"
        />
      </div>

      {/* Destinatarios */}
      <div>
        <label className="block text-[12px] font-semibold text-ink-secondary mb-1.5">
          <Users className="w-3.5 h-3.5 inline mr-1" />
          Destinatarios
        </label>

        <label className={cn(
          "flex items-center gap-2.5 border rounded-xl px-3 py-2.5 cursor-pointer mb-2 transition-ui",
          targetAll ? "border-brand-400 bg-brand-50" : "border-line-subtle hover:border-line-soft"
        )}>
          <input
            type="checkbox"
            checked={targetAll}
            onChange={e => { setTargetAll(e.target.checked); if (e.target.checked) setStageIds([]) }}
            className="accent-brand-600"
          />
          <div>
            <p className="text-[13px] font-medium text-ink-primary">Todos los leads activos</p>
            <p className="text-[11px] text-ink-tertiary">Cualquier lead del pipeline con número de WhatsApp</p>
          </div>
        </label>

        {!targetAll && (
          <div>
            <p className="text-[11px] font-medium text-ink-tertiary mb-2">O filtra por etapa del pipeline:</p>
            <div className="grid grid-cols-2 gap-2">
              {stages.map(s => (
                <label
                  key={s.id}
                  className={cn(
                    "flex items-center gap-2 border rounded-xl px-3 py-2 cursor-pointer transition-ui",
                    stageIds.includes(s.id)
                      ? "border-brand-400 bg-brand-50"
                      : "border-line-subtle hover:border-line-soft"
                  )}
                >
                  <input
                    type="checkbox"
                    checked={stageIds.includes(s.id)}
                    onChange={() => toggleStage(s.id)}
                    className="accent-brand-600"
                  />
                  <span className="text-[12px] font-medium text-ink-primary">{s.name}</span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Variable mapping */}
      {varIndices.length > 0 && (
        <div>
          <label className="block text-[12px] font-semibold text-ink-secondary mb-1.5">
            Mapeo de variables
          </label>
          <p className="text-[11px] text-ink-tertiary mb-2">
            Elige qué campo del lead se usará para cada variable de la plantilla.
          </p>
          <div className="space-y-2">
            {varIndices.map(idx => (
              <div key={idx} className="flex items-center gap-3">
                <span className="text-[12px] font-mono font-semibold text-brand-600 w-10">
                  {"{{" + idx + "}}"}
                </span>
                <select
                  value={variableMap[idx] ?? "fullName"}
                  onChange={e => setVariableMap(m => ({ ...m, [idx]: e.target.value }))}
                  className="flex-1 text-[12px] px-2.5 py-1.5 bg-canvas border border-line-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-300"
                >
                  {LEAD_FIELDS.map(f => (
                    <option key={f.value} value={f.value}>{f.label}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Preview mensaje */}
      <div className="bg-inset rounded-xl p-4">
        <p className="text-[11px] font-semibold text-ink-secondary mb-2">Ejemplo de mensaje</p>
        <div className="bg-[#DCF8C6] rounded-xl px-3 py-2.5 max-w-xs">
          <p className="text-[12px] text-gray-800 whitespace-pre-wrap leading-relaxed">
            {template.body.replace(/\{\{(\d+)\}\}/g, (_, n) => {
              const field = variableMap[n] ?? "fullName"
              const labels: Record<string, string> = { fullName: "Juan Pérez", firstName: "Juan", phone: "0991234567", email: "juan@gmail.com", interest: "Ortodoncia" }
              return `[${labels[field] ?? field}]`
            })}
          </p>
          {template.footer && <p className="text-[9px] text-gray-400 mt-1">{template.footer}</p>}
        </div>
        {buttons.length > 0 && (
          <div className="mt-1.5 space-y-1 max-w-xs">
            {buttons.map((b, i) => (
              <div key={i} className="bg-white rounded-lg text-center py-1.5 px-2 border border-gray-200">
                <span className="text-[11px] font-medium text-[#128C7E]">{b.text}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={onDone}
          className="flex-1 py-2.5 text-[13px] font-medium text-ink-secondary border border-line-subtle rounded-xl hover:bg-inset transition-ui"
        >
          Cancelar
        </button>
        <button
          onClick={handleSend}
          disabled={isPending}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 text-[13px] font-semibold text-white bg-green-600 hover:bg-green-700 rounded-xl transition-ui disabled:opacity-50"
        >
          <Send className="w-4 h-4" />
          {isPending ? "Enviando…" : "Enviar campaña"}
        </button>
      </div>
    </div>
  )
}
