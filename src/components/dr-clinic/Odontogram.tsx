"use client"

import { useState, useCallback } from "react"
import { Save, RotateCcw } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { saveOdontogramData } from "@/lib/actions/clinical"
import type { ToothSurface, SurfaceCondition, ToothCondition, ToothData, OdontogramData } from "@/types/clinical"

// ─── Arch layout (FDI notation) ───────────────────────────────────────────────
const UPPER_R = [18, 17, 16, 15, 14, 13, 12, 11]
const UPPER_L = [21, 22, 23, 24, 25, 26, 27, 28]
const LOWER_R = [48, 47, 46, 45, 44, 43, 42, 41]
const LOWER_L = [31, 32, 33, 34, 35, 36, 37, 38]

const ANTERIOR = new Set([11, 12, 13, 21, 22, 23, 31, 32, 33, 41, 42, 43])

const TOOTH_NAMES: Record<number, string> = {
  11: "Inc. central sup. der.", 12: "Inc. lateral sup. der.",
  13: "Canino sup. der.",       14: "Premolar 1 sup. der.",
  15: "Premolar 2 sup. der.",   16: "Molar 1 sup. der.",
  17: "Molar 2 sup. der.",      18: "Molar 3 sup. der.",
  21: "Inc. central sup. izq.", 22: "Inc. lateral sup. izq.",
  23: "Canino sup. izq.",       24: "Premolar 1 sup. izq.",
  25: "Premolar 2 sup. izq.",   26: "Molar 1 sup. izq.",
  27: "Molar 2 sup. izq.",      28: "Molar 3 sup. izq.",
  31: "Inc. central inf. izq.", 32: "Inc. lateral inf. izq.",
  33: "Canino inf. izq.",       34: "Premolar 1 inf. izq.",
  35: "Premolar 2 inf. izq.",   36: "Molar 1 inf. izq.",
  37: "Molar 2 inf. izq.",      38: "Molar 3 inf. izq.",
  41: "Inc. central inf. der.", 42: "Inc. lateral inf. der.",
  43: "Canino inf. der.",       44: "Premolar 1 inf. der.",
  45: "Premolar 2 inf. der.",   46: "Molar 1 inf. der.",
  47: "Molar 2 inf. der.",      48: "Molar 3 inf. der.",
}

// ─── Condition styles ─────────────────────────────────────────────────────────
type ConditionCfg = { label: string; bg: string; border: string; dotColor: string }

const CONDITIONS: Record<ToothCondition, ConditionCfg> = {
  sano:                { label: "Sano",               bg: "bg-white dark:bg-gray-800", border: "border-gray-200 dark:border-gray-600", dotColor: "#E5E7EB" },
  corona:              { label: "Corona",             bg: "bg-amber-50",               border: "border-amber-400",                     dotColor: "#FCD34D" },
  endodoncia:          { label: "Endodoncia",         bg: "bg-violet-100",             border: "border-violet-500",                    dotColor: "#A78BFA" },
  ausente:             { label: "Ausente",            bg: "bg-gray-100",               border: "border-gray-400",                      dotColor: "#9CA3AF" },
  extraccion_indicada: { label: "Extrac. indicada",   bg: "bg-red-50",                 border: "border-red-500",                       dotColor: "#EF4444" },
  implante:            { label: "Implante",           bg: "bg-green-50",               border: "border-green-500",                     dotColor: "#22C55E" },
  fractura:            { label: "Fractura",           bg: "bg-orange-50",              border: "border-orange-400",                    dotColor: "#FB923C" },
  protesis_fija:       { label: "Prótesis fija",      bg: "bg-sky-50",                 border: "border-sky-400",                       dotColor: "#38BDF8" },
  protesis_removible:  { label: "Prótesis removible", bg: "bg-purple-50",              border: "border-purple-400",                    dotColor: "#C084FC" },
}

const CONDITION_LIST = Object.entries(CONDITIONS) as [ToothCondition, ConditionCfg][]

// ─── Surface conditions ───────────────────────────────────────────────────────
const SURFACE_COLORS: Record<SurfaceCondition, string> = {
  "":                    "#F9FAFB",
  caries:                "#FCA5A5",
  obturacion_resina:     "#93C5FD",
  obturacion_amalgama:   "#9CA3AF",
  fractura:              "#FDE68A",
}

const SURFACE_LABELS: Record<SurfaceCondition, string> = {
  "":                    "Sano",
  caries:                "Caries",
  obturacion_resina:     "Obturación resina",
  obturacion_amalgama:   "Obturación amalgama",
  fractura:              "Fractura superficial",
}

const SURFACE_CYCLE: SurfaceCondition[] = ["", "caries", "obturacion_resina", "obturacion_amalgama", "fractura"]
function nextSurface(cur?: SurfaceCondition): SurfaceCondition {
  const i = SURFACE_CYCLE.indexOf(cur ?? "")
  return SURFACE_CYCLE[(i + 1) % SURFACE_CYCLE.length]
}

// ─── SVG tooth diagram (5-surface cross) ─────────────────────────────────────
function ToothSVG({
  surfaces,
  isAnterior,
  onSurface,
}: {
  surfaces: Partial<Record<ToothSurface, SurfaceCondition>>
  isAnterior: boolean
  onSurface: (s: ToothSurface) => void
}) {
  const c = (s: ToothSurface) => SURFACE_COLORS[surfaces[s] ?? ""]
  return (
    <svg
      viewBox="0 0 132 132"
      width="132"
      height="132"
      className="select-none flex-shrink-0"
    >
      <rect x="2" y="2" width="128" height="128" rx="16" fill="#F9FAFB" stroke="#E5E7EB" strokeWidth="2" />

      {/* V — Vestibular / top */}
      <path d="M20,2 L112,2 L96,44 L36,44 Z"
        fill={c("V")} stroke="#D1D5DB" strokeWidth="1.5"
        className="cursor-pointer hover:opacity-70 transition-opacity"
        onClick={() => onSurface("V")} />

      {/* L — Lingual / bottom */}
      <path d="M36,88 L96,88 L112,130 L20,130 Z"
        fill={c("L")} stroke="#D1D5DB" strokeWidth="1.5"
        className="cursor-pointer hover:opacity-70 transition-opacity"
        onClick={() => onSurface("L")} />

      {/* M — Mesial / left */}
      <path d="M2,20 L36,36 L36,96 L2,112 Z"
        fill={c("M")} stroke="#D1D5DB" strokeWidth="1.5"
        className="cursor-pointer hover:opacity-70 transition-opacity"
        onClick={() => onSurface("M")} />

      {/* D — Distal / right */}
      <path d="M96,36 L130,20 L130,112 L96,96 Z"
        fill={c("D")} stroke="#D1D5DB" strokeWidth="1.5"
        className="cursor-pointer hover:opacity-70 transition-opacity"
        onClick={() => onSurface("D")} />

      {/* O/I — Occlusal / center */}
      <rect x="36" y="36" width="60" height="60"
        fill={c("O")} stroke="#D1D5DB" strokeWidth="1.5"
        className="cursor-pointer hover:opacity-70 transition-opacity"
        onClick={() => onSurface("O")} />

      {/* Labels */}
      <text x="66" y="22" textAnchor="middle" fontSize="9" fill="#9CA3AF" fontFamily="system-ui" fontWeight="700">V</text>
      <text x="66" y="122" textAnchor="middle" fontSize="9" fill="#9CA3AF" fontFamily="system-ui" fontWeight="700">L</text>
      <text x="17" y="70" textAnchor="middle" fontSize="9" fill="#9CA3AF" fontFamily="system-ui" fontWeight="700">M</text>
      <text x="115" y="70" textAnchor="middle" fontSize="9" fill="#9CA3AF" fontFamily="system-ui" fontWeight="700">D</text>
      <text x="66" y="71" textAnchor="middle" fontSize="9" fill="#9CA3AF" fontFamily="system-ui" fontWeight="700">
        {isAnterior ? "I" : "O"}
      </text>
    </svg>
  )
}

// ─── Compact tooth cell ───────────────────────────────────────────────────────
function ToothCell({
  num, data, isSelected, isUpper, onClick,
}: {
  num: number; data: ToothData | undefined; isSelected: boolean; isUpper: boolean; onClick: () => void
}) {
  const condition = data?.condition ?? "sano"
  const cfg = CONDITIONS[condition]
  const gone = condition === "ausente" || condition === "extraccion_indicada"
  const hasSurface = !gone && data?.surfaces && Object.values(data.surfaces).some(s => s)

  return (
    <button
      onClick={onClick}
      title={`${num} — ${TOOTH_NAMES[num] ?? ""}`}
      className="flex flex-col items-center gap-[3px] group focus:outline-none"
    >
      {isUpper && (
        <span className={cn("text-[8px] font-semibold tabular-nums leading-none",
          isSelected ? "text-brand-600" : "text-ink-tertiary")}>
          {num}
        </span>
      )}

      <div className={cn(
        "w-[26px] h-[26px] rounded-[4px] border-2 flex items-center justify-center relative overflow-hidden transition-all duration-100",
        cfg.bg, cfg.border,
        gone && "opacity-40",
        isSelected
          ? "ring-2 ring-brand-500 ring-offset-1 scale-110 shadow-sm z-10"
          : "group-hover:scale-105 group-hover:shadow-sm"
      )}>
        {gone && (
          <svg viewBox="0 0 26 26" className={cn("w-3.5 h-3.5",
            condition === "extraccion_indicada" ? "text-red-500" : "text-gray-400")}>
            <line x1="6" y1="6" x2="20" y2="20" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="20" y1="6" x2="6" y2="20" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        )}
        {hasSurface && (
          <div className="absolute inset-[2px] rounded-[2px] opacity-30"
            style={{ background: "radial-gradient(circle at 50% 50%, #EF4444 20%, transparent 70%)" }} />
        )}
      </div>

      {!isUpper && (
        <span className={cn("text-[8px] font-semibold tabular-nums leading-none",
          isSelected ? "text-brand-600" : "text-ink-tertiary")}>
          {num}
        </span>
      )}
    </button>
  )
}

// ─── Detail panel ────────────────────────────────────────────────────────────
function ToothDetail({
  num, data, onChange,
}: {
  num: number; data: ToothData; onChange: (d: ToothData) => void
}) {
  const isAnterior = ANTERIOR.has(num)
  const gone = data.condition === "ausente" || data.condition === "extraccion_indicada"

  const handleSurface = (s: ToothSurface) => {
    onChange({ ...data, surfaces: { ...data.surfaces, [s]: nextSurface(data.surfaces[s]) } })
  }

  const handleCondition = (c: ToothCondition) => {
    const next: ToothData = { ...data, condition: c }
    if (c === "ausente" || c === "extraccion_indicada") next.surfaces = {}
    onChange(next)
  }

  return (
    <div className="mt-3 border border-line-soft rounded-xl bg-surface p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2.5">
        <div className={cn(
          "w-8 h-8 rounded-[6px] border-2 flex items-center justify-center flex-shrink-0",
          CONDITIONS[data.condition].bg, CONDITIONS[data.condition].border
        )}>
          {gone && (
            <svg viewBox="0 0 28 28" className={cn("w-4 h-4",
              data.condition === "extraccion_indicada" ? "text-red-500" : "text-gray-400")}>
              <line x1="7" y1="7" x2="21" y2="21" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              <line x1="21" y1="7" x2="7" y2="21" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          )}
        </div>
        <div>
          <p className="text-[13px] font-semibold text-ink-primary leading-tight">Pieza {num}</p>
          <p className="text-[11px] text-ink-tertiary leading-tight">{TOOTH_NAMES[num] ?? ""}</p>
        </div>
        <div className={cn(
          "ml-auto text-[11px] font-medium px-2 py-1 rounded-lg border",
          CONDITIONS[data.condition].bg, CONDITIONS[data.condition].border, "text-ink-secondary"
        )}>
          {CONDITIONS[data.condition].label}
        </div>
      </div>

      <div className="flex gap-5 flex-wrap">
        {/* Surface SVG */}
        <div className="flex-shrink-0 space-y-2">
          <p className="text-[10px] font-semibold text-ink-tertiary uppercase tracking-wide">
            Superficies {isAnterior ? "(I = Incisal)" : "(O = Oclusal)"}
          </p>
          {gone ? (
            <div className="w-[132px] h-[132px] rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 flex items-center justify-center text-xs text-ink-tertiary">
              Sin superficie
            </div>
          ) : (
            <ToothSVG
              surfaces={data.surfaces}
              isAnterior={isAnterior}
              onSurface={handleSurface}
            />
          )}
          {/* Surface legend */}
          <div className="space-y-1">
            {(Object.entries(SURFACE_LABELS) as [SurfaceCondition, string][]).filter(([k]) => k !== "").map(([k, label]) => (
              <div key={k} className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: SURFACE_COLORS[k] }} />
                <span className="text-[10px] text-ink-tertiary">{label}</span>
              </div>
            ))}
            <p className="text-[10px] text-ink-tertiary mt-1 italic">Clic en superficie para ciclar condición</p>
          </div>
        </div>

        {/* Right: condition + notes */}
        <div className="flex-1 min-w-0 space-y-3">
          <div>
            <p className="text-[10px] font-semibold text-ink-tertiary uppercase tracking-wide mb-2">Condición general</p>
            <div className="flex flex-wrap gap-1.5">
              {CONDITION_LIST.map(([key, cfg]) => (
                <button
                  key={key}
                  onClick={() => handleCondition(key)}
                  className={cn(
                    "px-2.5 py-1.5 rounded-lg border text-[11px] font-medium transition-all",
                    key === data.condition
                      ? cn(cfg.bg, cfg.border, "shadow-sm scale-105")
                      : "bg-inset border-line-subtle text-ink-secondary hover:bg-surface hover:border-line-soft"
                  )}
                >
                  {cfg.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[10px] font-semibold text-ink-tertiary uppercase tracking-wide">
              Notas de esta pieza
            </label>
            <textarea
              value={data.notes}
              onChange={e => onChange({ ...data, notes: e.target.value })}
              placeholder="Observaciones específicas para esta pieza..."
              rows={3}
              className="mt-1.5 w-full text-sm border border-line-soft rounded-lg px-3 py-2 bg-inset text-ink-primary placeholder:text-ink-tertiary focus:outline-none focus:border-brand-300 focus:ring-1 focus:ring-brand-200 resize-none"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
interface OdontogramProps {
  leadId:      string
  initialData: OdontogramData
}

export function Odontogram({ leadId, initialData }: OdontogramProps) {
  const [data, setData]         = useState<OdontogramData>(initialData)
  const [selected, setSelected] = useState<number | null>(null)
  const [saving, setSaving]     = useState(false)
  const [dirty, setDirty]       = useState(false)

  const getOrDefault = useCallback((num: number): ToothData => (
    data[String(num)] ?? { condition: "sano", surfaces: {}, notes: "" }
  ), [data])

  const updateTooth = (num: number, d: ToothData) => {
    setData(prev => ({ ...prev, [String(num)]: d }))
    setDirty(true)
  }

  const handleSave = async () => {
    setSaving(true)
    const res = await saveOdontogramData({ leadId, odontogramData: data })
    setSaving(false)
    if (res.success) { setDirty(false); toast.success("Odontograma guardado") }
    else toast.error((res as { error: string }).error ?? "Error al guardar")
  }

  const Row = ({ teeth, isUpper }: { teeth: number[]; isUpper: boolean }) => (
    <div className="flex items-center gap-1.5">
      {teeth.map(n => (
        <ToothCell
          key={n}
          num={n}
          data={getOrDefault(n)}
          isSelected={selected === n}
          isUpper={isUpper}
          onClick={() => setSelected(prev => prev === n ? null : n)}
        />
      ))}
    </div>
  )

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-ink-tertiary">
          Haz clic en una pieza para registrar condiciones y superficies afectadas
        </p>
        <div className="flex items-center gap-2">
          {dirty && (
            <button
              onClick={() => { setData(initialData); setSelected(null); setDirty(false) }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-ink-secondary hover:bg-inset rounded-lg transition-ui"
            >
              <RotateCcw className="w-3 h-3" /> Deshacer
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={saving || !dirty}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-ui",
              dirty
                ? "bg-brand-500 text-white hover:bg-brand-600"
                : "bg-inset text-ink-disabled cursor-not-allowed"
            )}
          >
            {saving
              ? <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <Save className="w-3 h-3" />
            }
            Guardar
          </button>
        </div>
      </div>

      {/* Chart */}
      <div className="border border-line-soft rounded-xl bg-surface p-5 overflow-x-auto">
        {/* Quadrant labels — top */}
        <div className="flex mb-1 px-2">
          <span className="flex-1 text-center text-[9px] font-semibold text-ink-tertiary uppercase tracking-wider">
            Cuadrante I — Sup. Der.
          </span>
          <div className="w-4" />
          <span className="flex-1 text-center text-[9px] font-semibold text-ink-tertiary uppercase tracking-wider">
            Cuadrante II — Sup. Izq.
          </span>
        </div>

        {/* Upper arch */}
        <div className="flex justify-center gap-3 items-end">
          <Row teeth={UPPER_R} isUpper={true} />
          <div className="w-px bg-line-medium self-stretch" />
          <Row teeth={UPPER_L} isUpper={true} />
        </div>

        {/* Midline */}
        <div className="flex items-center gap-2 my-2 px-2">
          <div className="flex-1 h-px bg-line-subtle" />
          <span className="text-[8px] text-ink-tertiary uppercase tracking-widest flex-shrink-0">Línea media</span>
          <div className="flex-1 h-px bg-line-subtle" />
        </div>

        {/* Lower arch */}
        <div className="flex justify-center gap-3 items-start">
          <Row teeth={LOWER_R} isUpper={false} />
          <div className="w-px bg-line-medium self-stretch" />
          <Row teeth={LOWER_L} isUpper={false} />
        </div>

        {/* Quadrant labels — bottom */}
        <div className="flex mt-1 px-2">
          <span className="flex-1 text-center text-[9px] font-semibold text-ink-tertiary uppercase tracking-wider">
            Cuadrante IV — Inf. Der.
          </span>
          <div className="w-4" />
          <span className="flex-1 text-center text-[9px] font-semibold text-ink-tertiary uppercase tracking-wider">
            Cuadrante III — Inf. Izq.
          </span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 px-1">
        {CONDITION_LIST.map(([key, cfg]) => (
          <div key={key} className="flex items-center gap-1.5">
            <div className={cn("w-3.5 h-3.5 rounded-[3px] border", cfg.bg, cfg.border)} />
            <span className="text-[11px] text-ink-tertiary">{cfg.label}</span>
          </div>
        ))}
      </div>

      {/* Detail panel */}
      {selected !== null && (
        <ToothDetail
          num={selected}
          data={getOrDefault(selected)}
          onChange={d => updateTooth(selected, d)}
        />
      )}
    </div>
  )
}
