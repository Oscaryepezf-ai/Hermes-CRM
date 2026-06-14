"use client"

import { useState, useTransition } from "react"
import { Bot, Lock, Plus, X, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { updateCaptadorSettings } from "@/lib/actions/captador"
import { toast } from "sonner"

type Config = {
  businessHours: { start: number; end: number }
  maxTurns: number
  tone: "formal" | "amigable"
  specialties: string[]
  knowledgeBase: string
}

interface AssistantSettingsViewProps {
  plan: string
  initialActive: boolean
  initialConfig: Config
}

export function AssistantSettingsView({ plan, initialActive, initialConfig }: AssistantSettingsViewProps) {
  const [active, setActive] = useState(initialActive)
  const [config, setConfig] = useState(initialConfig)
  const [newSpecialty, setNewSpecialty] = useState("")
  const [isPending, startTransition] = useTransition()

  const isElite = plan === "CLINICA"

  function addSpecialty() {
    const value = newSpecialty.trim()
    if (!value || config.specialties.includes(value)) return
    setConfig({ ...config, specialties: [...config.specialties, value] })
    setNewSpecialty("")
  }

  function removeSpecialty(value: string) {
    setConfig({ ...config, specialties: config.specialties.filter(s => s !== value) })
  }

  function handleSave() {
    startTransition(async () => {
      const result = await updateCaptadorSettings({ active, config })
      if (result.success) {
        toast.success("Configuración de Yana guardada")
      } else {
        toast.error(result.error)
      }
    })
  }

  if (!isElite) {
    return (
      <div className="bg-surface border border-line-subtle rounded-[12px] p-6 shadow-card flex items-start gap-3">
        <div className="w-10 h-10 rounded-[10px] bg-inset flex items-center justify-center flex-shrink-0">
          <Lock className="w-5 h-5 text-ink-tertiary" />
        </div>
        <div>
          <h3 className="text-[14px] font-bold text-ink-primary">Disponible en el plan Elite</h3>
          <p className="text-[12px] text-ink-tertiary mt-1 max-w-md">
            Yana — el asistente de IA que califica y responde a tus prospectos automáticamente — está incluido
            en el plan Elite. Actualiza tu plan para activarlo.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Activation toggle */}
      <div className="bg-surface border border-line-subtle rounded-[12px] p-5 shadow-card flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[10px] bg-brand-50 flex items-center justify-center flex-shrink-0">
            <Bot className="w-5 h-5 text-brand-600" />
          </div>
          <div>
            <h3 className="text-[14px] font-bold text-ink-primary">Activar Yana</h3>
            <p className="text-[12px] text-ink-tertiary mt-0.5">
              Cuando esté activo, Yana responderá automáticamente a nuevos mensajes de prospectos
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setActive(!active)}
          className={cn(
            "relative w-11 h-6 rounded-full transition-colors flex-shrink-0",
            active ? "bg-brand-500" : "bg-inset border border-line-subtle"
          )}
          aria-pressed={active}
        >
          <span
            className={cn(
              "absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform",
              active && "translate-x-5"
            )}
          />
        </button>
      </div>

      {/* General config */}
      <div className="bg-surface border border-line-subtle rounded-[12px] p-5 shadow-card space-y-5">
        <h3 className="text-[14px] font-bold text-ink-primary">Comportamiento</h3>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-[12px] font-medium text-ink-secondary block mb-1.5">Tono de conversación</label>
            <select
              value={config.tone}
              onChange={(e) => setConfig({ ...config, tone: e.target.value as Config["tone"] })}
              className="w-full h-9 rounded-lg border border-line-subtle bg-transparent px-2.5 text-[13px] text-ink-primary outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
            >
              <option value="amigable">Amigable</option>
              <option value="formal">Formal</option>
            </select>
          </div>

          <div>
            <label className="text-[12px] font-medium text-ink-secondary block mb-1.5">
              Turnos antes de pasar a un humano
            </label>
            <input
              type="number"
              min={1}
              max={10}
              value={config.maxTurns}
              onChange={(e) => setConfig({ ...config, maxTurns: Number(e.target.value) })}
              className="w-full h-9 rounded-lg border border-line-subtle bg-transparent px-2.5 text-[13px] text-ink-primary outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
            />
          </div>

          <div>
            <label className="text-[12px] font-medium text-ink-secondary block mb-1.5">Horario — inicio</label>
            <input
              type="number"
              min={0}
              max={23}
              value={config.businessHours.start}
              onChange={(e) => setConfig({
                ...config,
                businessHours: { ...config.businessHours, start: Number(e.target.value) },
              })}
              className="w-full h-9 rounded-lg border border-line-subtle bg-transparent px-2.5 text-[13px] text-ink-primary outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
            />
          </div>

          <div>
            <label className="text-[12px] font-medium text-ink-secondary block mb-1.5">Horario — fin</label>
            <input
              type="number"
              min={1}
              max={24}
              value={config.businessHours.end}
              onChange={(e) => setConfig({
                ...config,
                businessHours: { ...config.businessHours, end: Number(e.target.value) },
              })}
              className="w-full h-9 rounded-lg border border-line-subtle bg-transparent px-2.5 text-[13px] text-ink-primary outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
            />
          </div>
        </div>

        <p className="text-[11px] text-ink-tertiary">
          Las horas se interpretan en zona horaria de Colombia (ej: 8 a 20 = 8am a 8pm)
        </p>
      </div>

      {/* Specialties */}
      <div className="bg-surface border border-line-subtle rounded-[12px] p-5 shadow-card space-y-3">
        <div>
          <h3 className="text-[14px] font-bold text-ink-primary">Tratamientos que ofreces</h3>
          <p className="text-[12px] text-ink-tertiary mt-0.5">
            Yana mencionará estos tratamientos al conversar con los prospectos
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {config.specialties.map((s) => (
            <span
              key={s}
              className="inline-flex items-center gap-1.5 bg-inset border border-line-subtle rounded-full px-3 py-1 text-[12px] text-ink-secondary"
            >
              {s}
              <button type="button" onClick={() => removeSpecialty(s)} className="text-ink-tertiary hover:text-ink-primary">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={newSpecialty}
            onChange={(e) => setNewSpecialty(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSpecialty() } }}
            placeholder="Ej: Endodoncia"
            className="flex-1 h-9 rounded-lg border border-line-subtle bg-transparent px-2.5 text-[13px] text-ink-primary outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
          />
          <Button type="button" variant="outline" size="sm" onClick={addSpecialty}>
            <Plus className="w-3.5 h-3.5" />
            Agregar
          </Button>
        </div>
      </div>

      {/* Knowledge base */}
      <div className="bg-surface border border-line-subtle rounded-[12px] p-5 shadow-card space-y-3">
        <div>
          <h3 className="text-[14px] font-bold text-ink-primary">Información de la clínica</h3>
          <p className="text-[12px] text-ink-tertiary mt-0.5">
            Precios orientativos, ubicación, políticas, promociones — Yana usará esta información para
            responder preguntas frecuentes sin inventar datos.
          </p>
        </div>
        <Textarea
          value={config.knowledgeBase}
          onChange={(e) => setConfig({ ...config, knowledgeBase: e.target.value })}
          rows={8}
          maxLength={4000}
          placeholder={`Ej:\n- Ubicación: Av. Amazonas N34-12, Quito\n- Limpieza dental desde $30\n- Aceptamos seguros: Salud S.A., SaludPlan\n- Promoción: 20% de descuento en blanqueamiento durante diciembre`}
          className="text-[13px]"
        />
        <p className="text-[11px] text-ink-tertiary text-right">{config.knowledgeBase.length} / 4000</p>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isPending}>
          {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          Guardar cambios
        </Button>
      </div>
    </div>
  )
}
