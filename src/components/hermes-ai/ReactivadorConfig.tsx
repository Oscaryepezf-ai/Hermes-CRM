"use client"

import { useState, useEffect } from "react"
import { RotateCcw, Zap, MessageCircle, Clock, Repeat, Gift, Volume2, Eye } from "lucide-react"
import { toast } from "sonner"
import { getReactivadorData, saveReactivadorConfig } from "@/lib/actions/reactivador"
import { ReactivadorStats } from "./ReactivadorStats"

type Config = {
  inactivityDays:  number
  maxAttempts:     number
  daysBetweenMsgs: number
  incentive:       string
  tone:            'amigable' | 'formal'
  channels:        string[]
}

const DEFAULT_CONFIG: Config = {
  inactivityDays:  90,
  maxAttempts:     3,
  daysBetweenMsgs: 7,
  incentive:       '',
  tone:            'amigable',
  channels:        ['WHATSAPP'],
}

export function ReactivadorConfig() {
  const [active,  setActive]  = useState(false)
  const [config,  setConfig]  = useState<Config>(DEFAULT_CONFIG)
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)

  useEffect(() => {
    getReactivadorData().then(res => {
      if (res.success && res.data) {
        setActive(res.data.active)
        setConfig({ ...DEFAULT_CONFIG, ...(res.data.config as Partial<Config>) })
      }
      setLoading(false)
    })
  }, [])

  const handleSave = async () => {
    setSaving(true)
    const res = await saveReactivadorConfig({
      active,
      inactivityDays:  config.inactivityDays,
      maxAttempts:     config.maxAttempts,
      daysBetweenMsgs: config.daysBetweenMsgs,
      incentive:       config.incentive || undefined,
      tone:            config.tone,
      channels:        config.channels,
    })
    setSaving(false)

    if (res.success) {
      toast.success(active ? "Reactivador activado" : "Reactivador desactivado")
    } else {
      toast.error("Error al guardar la configuración")
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <p className="text-sm text-ink-tertiary">Cargando...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Toggle principal */}
      <div className="flex items-center justify-between p-4 bg-surface rounded-xl border border-line-soft">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${active ? 'bg-indigo-100' : 'bg-canvas'}`}>
            <RotateCcw className={`w-5 h-5 ${active ? 'text-indigo-600' : 'text-ink-tertiary'}`} />
          </div>
          <div>
            <p className="font-semibold text-sm text-ink-primary">Hermes Reactivador</p>
            <p className="text-xs text-ink-tertiary">
              {active
                ? `Contactando pacientes inactivos hace +${config.inactivityDays} días`
                : 'Inactivo — los pacientes no serán contactados'}
            </p>
          </div>
        </div>
        <button
          onClick={() => setActive(!active)}
          className={`relative w-11 h-6 rounded-full transition-colors ${active ? 'bg-indigo-600' : 'bg-line-soft'}`}
        >
          <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${active ? 'translate-x-5' : 'translate-x-0'}`} />
        </button>
      </div>

      {/* Estadísticas */}
      <div>
        <p className="text-xs font-semibold text-ink-tertiary uppercase tracking-wider mb-3">
          Rendimiento del mes
        </p>
        <ReactivadorStats />
      </div>

      {/* Configuración de inactividad */}
      <div className="space-y-4">
        <p className="text-xs font-semibold text-ink-tertiary uppercase tracking-wider flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" />
          Umbrales de inactividad
        </p>

        <div className="space-y-3">
          <div>
            <div className="flex justify-between mb-1">
              <label className="text-xs font-medium text-ink-secondary">
                Días sin cita para contactar
              </label>
              <span className="text-xs font-semibold text-indigo-600">{config.inactivityDays} días</span>
            </div>
            <input
              type="range"
              min={30}
              max={180}
              step={15}
              value={config.inactivityDays}
              onChange={e => setConfig(c => ({ ...c, inactivityDays: parseInt(e.target.value) }))}
              className="w-full accent-indigo-600"
            />
            <div className="flex justify-between text-[10px] text-ink-tertiary mt-0.5">
              <span>30 días</span>
              <span>180 días</span>
            </div>
          </div>

          <div>
            <div className="flex justify-between mb-1">
              <label className="text-xs font-medium text-ink-secondary">
                Días entre mensajes del mismo paciente
              </label>
              <span className="text-xs font-semibold text-indigo-600">{config.daysBetweenMsgs} días</span>
            </div>
            <input
              type="range"
              min={3}
              max={14}
              step={1}
              value={config.daysBetweenMsgs}
              onChange={e => setConfig(c => ({ ...c, daysBetweenMsgs: parseInt(e.target.value) }))}
              className="w-full accent-indigo-600"
            />
            <div className="flex justify-between text-[10px] text-ink-tertiary mt-0.5">
              <span>3 días</span>
              <span>14 días</span>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-ink-secondary flex items-center gap-1">
              <Repeat className="w-3.5 h-3.5" />
              Intentos máximos por paciente
            </label>
            <select
              value={config.maxAttempts}
              onChange={e => setConfig(c => ({ ...c, maxAttempts: parseInt(e.target.value) }))}
              className="w-full h-9 px-3 text-sm border border-line-soft rounded-lg bg-canvas text-ink-primary focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {[1, 2, 3, 4, 5].map(n => (
                <option key={n} value={n}>{n} mensaje{n > 1 ? 's' : ''}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Incentivo */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-ink-tertiary uppercase tracking-wider flex items-center gap-1.5">
          <Gift className="w-3.5 h-3.5" />
          Incentivo para el último mensaje (opcional)
        </label>
        <input
          type="text"
          placeholder="Ej: limpieza gratis, 10% descuento, valoración sin costo…"
          value={config.incentive}
          onChange={e => setConfig(c => ({ ...c, incentive: e.target.value }))}
          className="w-full h-9 px-3 text-sm border border-line-soft rounded-lg bg-canvas text-ink-primary focus:outline-none focus:ring-2 focus:ring-indigo-500"
          maxLength={200}
        />
        <p className="text-[11px] text-ink-tertiary">
          Si está vacío, el tercer mensaje ofrece flexibilidad de horario en su lugar.
        </p>
      </div>

      {/* Tono */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-ink-tertiary uppercase tracking-wider flex items-center gap-1.5">
          <Volume2 className="w-3.5 h-3.5" />
          Tono de comunicación
        </label>
        <div className="grid grid-cols-2 gap-2">
          {([['amigable', 'Amigable y cercano', '😊'], ['formal', 'Formal y profesional', '👔']] as const).map(
            ([value, label, emoji]) => (
              <button
                key={value}
                onClick={() => setConfig(c => ({ ...c, tone: value }))}
                className={`flex items-center gap-2 p-3 rounded-xl border text-sm font-medium transition-colors ${
                  config.tone === value
                    ? 'border-indigo-400 bg-indigo-50 text-indigo-700'
                    : 'border-line-soft bg-canvas text-ink-secondary hover:border-line-soft/80'
                }`}
              >
                <span>{emoji}</span>
                <span>{label}</span>
              </button>
            )
          )}
        </div>
      </div>

      {/* Estrategia de mensajes — info */}
      <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 space-y-2">
        <p className="text-xs font-semibold text-indigo-700 flex items-center gap-1.5">
          <MessageCircle className="w-3.5 h-3.5" />
          Estrategia de 3 mensajes con IA
        </p>
        <div className="space-y-1.5 text-xs text-indigo-600">
          <div className="flex gap-2">
            <span className="font-bold w-4 flex-shrink-0">1.</span>
            <span>Recordatorio empático — pregunta por el bienestar del paciente</span>
          </div>
          <div className="flex gap-2">
            <span className="font-bold w-4 flex-shrink-0">2.</span>
            <span>Seguimiento con beneficio — importancia del control dental</span>
          </div>
          <div className="flex gap-2">
            <span className="font-bold w-4 flex-shrink-0">3.</span>
            <span>Último intento — incluye el incentivo si está configurado</span>
          </div>
        </div>
        <p className="text-[11px] text-indigo-500 mt-1">
          Cada mensaje es generado por GPT‑4o-mini con el nombre del paciente y su historial.
        </p>
      </div>

      {/* Botón guardar */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full h-10 text-sm font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
      >
        <Zap className="w-4 h-4" />
        {saving ? 'Guardando…' : 'Guardar configuración'}
      </button>
    </div>
  )
}
