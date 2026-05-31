"use client"

import { useEffect, useState } from "react"
import {
  Bot, Zap, Clock, MessageCircle, Globe, Camera,
  Save, Loader2, ChevronRight,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

type CaptadorData = {
  active:     boolean
  config:     CaptadorConfig | null
  totalLeads: number
  handedOff:  number
}

type CaptadorConfig = {
  businessHours: { start: number; end: number }
  maxTurns:      number
  tone:          'formal' | 'amigable'
  specialties:   string[]
}

const DEFAULT_CONFIG: CaptadorConfig = {
  businessHours: { start: 8, end: 20 },
  maxTurns:      4,
  tone:          'amigable',
  specialties:   ['Ortodoncia', 'Implantes', 'Blanqueamiento', 'Limpieza', 'Cirugía'],
}

export function CaptadorConfig({ onClose }: { onClose?: () => void }) {
  const [data, setData]       = useState<CaptadorData | null>(null)
  const [saving, setSaving]   = useState(false)
  const [loading, setLoading] = useState(true)

  // Local form state
  const [active, setActive]       = useState(false)
  const [startHour, setStartHour] = useState(8)
  const [endHour, setEndHour]     = useState(20)
  const [maxTurns, setMaxTurns]   = useState(4)
  const [tone, setTone]           = useState<'formal' | 'amigable'>('amigable')

  useEffect(() => {
    fetch('/api/captador/toggle')
      .then(r => r.json())
      .then((d: CaptadorData & { active: boolean }) => {
        setData(d)
        setActive(d.active)
        const cfg = d.config ?? DEFAULT_CONFIG
        setStartHour(cfg.businessHours.start)
        setEndHour(cfg.businessHours.end)
        setMaxTurns(cfg.maxTurns)
        setTone(cfg.tone)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/captador/toggle', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          active,
          config: {
            businessHours: { start: startHour, end: endHour },
            maxTurns,
            tone,
            specialties: DEFAULT_CONFIG.specialties,
          },
        }),
      })
      if (res.ok) toast.success('Configuración guardada')
      else        toast.error('Error al guardar')
    } catch {
      toast.error('Error de conexión')
    }
    setSaving(false)
  }

  const handleToggle = async (newActive: boolean) => {
    setActive(newActive)
    await fetch('/api/captador/toggle', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ active: newActive }),
    })
    toast.success(newActive ? 'Hermes Captador activado' : 'Hermes Captador desactivado')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Stats row */}
      {data && (
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Leads captados" value={String(data.totalLeads)} icon={Bot} color="text-indigo-500 bg-indigo-50" />
          <StatCard label="Calificados" value={String(data.handedOff)} icon={Zap} color="text-violet-500 bg-violet-50" />
        </div>
      )}

      {/* Main toggle */}
      <div className={cn(
        "flex items-center justify-between rounded-[12px] p-4 border transition-ui",
        active ? "bg-indigo-50 border-indigo-200" : "bg-surface border-line-subtle"
      )}>
        <div>
          <p className="text-[14px] font-[550] text-ink-primary">Hermes Captador</p>
          <p className="text-[12px] text-ink-tertiary mt-0.5">Responde automáticamente a mensajes entrantes</p>
        </div>
        <button
          onClick={() => handleToggle(!active)}
          className={cn(
            "relative w-11 h-6 rounded-full transition-all duration-200 flex-shrink-0",
            active ? "bg-indigo-600" : "bg-gray-200"
          )}
        >
          <span className={cn(
            "absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-200",
            active ? "left-5" : "left-0.5"
          )} />
        </button>
      </div>

      {/* Business hours */}
      <Section title="Horario del agente" icon={Clock}>
        <div className="flex items-center gap-3">
          <div className="flex-1 space-y-1">
            <label className="text-[11px] text-ink-tertiary font-medium">Desde</label>
            <select
              value={startHour}
              onChange={e => setStartHour(parseInt(e.target.value))}
              className="w-full border border-line-soft rounded-[8px] px-3 py-2 text-[13px] text-ink-primary bg-surface"
            >
              {Array.from({ length: 16 }, (_, i) => i + 6).map(h => (
                <option key={h} value={h}>{h}:00 {h < 12 ? 'AM' : 'PM'}</option>
              ))}
            </select>
          </div>
          <div className="flex-1 space-y-1">
            <label className="text-[11px] text-ink-tertiary font-medium">Hasta</label>
            <select
              value={endHour}
              onChange={e => setEndHour(parseInt(e.target.value))}
              className="w-full border border-line-soft rounded-[8px] px-3 py-2 text-[13px] text-ink-primary bg-surface"
            >
              {Array.from({ length: 16 }, (_, i) => i + 8).map(h => (
                <option key={h} value={h}>{h}:00 {h < 12 ? 'AM' : 'PM'}</option>
              ))}
            </select>
          </div>
        </div>
        <p className="text-[11px] text-ink-tertiary">Zona horaria: Colombia (UTC-5). Fuera de horario envía mensaje informativo.</p>
      </Section>

      {/* Channels */}
      <Section title="Canales activos" icon={MessageCircle}>
        <div className="space-y-2">
          {[
            { icon: MessageCircle, label: 'WhatsApp Business', color: '#25D366', enabled: true },
            { icon: Globe,         label: 'Facebook Messenger', color: '#1877F2', enabled: true },
            { icon: Camera,        label: 'Instagram DM',       color: '#E1306C', enabled: true },
          ].map(ch => (
            <div key={ch.label} className="flex items-center justify-between rounded-[8px] bg-inset px-3 py-2.5">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full" style={{ background: ch.color }} />
                <span className="text-[12px] font-medium text-ink-secondary">{ch.label}</span>
              </div>
              <span className="text-[10px] font-medium text-[#15694A] bg-[#EDFAF4] px-1.5 py-0.5 rounded-[4px]">
                Activo
              </span>
            </div>
          ))}
        </div>
      </Section>

      {/* Max turns */}
      <Section title={`Turnos antes del traspaso: ${maxTurns}`} icon={ChevronRight}>
        <input
          type="range"
          min={2}
          max={6}
          value={maxTurns}
          onChange={e => setMaxTurns(parseInt(e.target.value))}
          className="w-full accent-indigo-600"
        />
        <div className="flex justify-between text-[10px] text-ink-tertiary">
          <span>2 (rápido)</span><span>4 (recomendado)</span><span>6 (completo)</span>
        </div>
        <p className="text-[11px] text-ink-tertiary">
          El agente hará hasta {maxTurns} intercambios antes de notificar a tu equipo.
        </p>
      </Section>

      {/* Tone */}
      <Section title="Tono de comunicación" icon={Bot}>
        <div className="grid grid-cols-2 gap-2">
          {(['amigable', 'formal'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTone(t)}
              className={cn(
                "rounded-[8px] px-3 py-2.5 text-[12px] font-medium border transition-ui text-left",
                tone === t
                  ? "bg-indigo-50 border-indigo-200 text-indigo-700"
                  : "bg-surface border-line-subtle text-ink-secondary hover:border-line-soft"
              )}
            >
              {t === 'amigable' ? '😊 Amigable y cercano' : '🤝 Formal y profesional'}
              {t === 'amigable' && <span className="ml-1 text-[10px] text-indigo-400">(recomendado)</span>}
            </button>
          ))}
        </div>
      </Section>

      {/* Save */}
      <Button
        onClick={handleSave}
        disabled={saving}
        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-[13px] h-10"
      >
        {saving
          ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Guardando...</>
          : <><Save className="w-4 h-4 mr-2" />Guardar configuración</>
        }
      </Button>
    </div>
  )
}

function Section({ title, icon: Icon, children }: {
  title: string; icon: React.ElementType; children: React.ReactNode
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 text-ink-tertiary" />
        <p className="text-[12px] font-[550] text-ink-secondary uppercase tracking-[0.04em]">{title}</p>
      </div>
      {children}
    </div>
  )
}

function StatCard({ label, value, icon: Icon, color }: {
  label: string; value: string; icon: React.ElementType; color: string
}) {
  return (
    <div className="bg-surface border border-line-subtle rounded-[10px] p-3 shadow-card">
      <div className={cn("w-7 h-7 rounded-[7px] flex items-center justify-center mb-2", color.split(' ')[1])}>
        <Icon className={cn("w-3.5 h-3.5", color.split(' ')[0])} />
      </div>
      <p className="text-[20px] font-bold text-ink-primary tabular-nums leading-tight">{value}</p>
      <p className="text-[11px] text-ink-tertiary mt-0.5">{label}</p>
    </div>
  )
}
