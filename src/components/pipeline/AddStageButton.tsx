"use client"

import { useState } from "react"
import { Plus, X } from "lucide-react"
import { toast } from "sonner"
import { createCustomStage } from "@/lib/actions/stages"
import { CUSTOM_STAGE_COLORS } from "@/lib/pipeline/default-stages"

interface AddStageButtonProps {
  insertAfterOrder: number
  disabled?: boolean
  onCreated: () => void
}

export function AddStageButton({ insertAfterOrder, disabled, onCreated }: AddStageButtonProps) {
  const [open,    setOpen]    = useState(false)
  const [name,    setName]    = useState("")
  const [colorIdx, setColorIdx] = useState(0)
  const [loading, setLoading] = useState(false)

  const selected = CUSTOM_STAGE_COLORS[colorIdx]

  const handleCreate = async () => {
    if (name.trim().length < 2) { toast.error("El nombre debe tener al menos 2 caracteres"); return }
    setLoading(true)
    const res = await createCustomStage({
      name:             name.trim(),
      color:            selected.color,
      bgColor:          selected.bg,
      headerBgColor:    selected.header,
      insertAfterOrder,
    })
    setLoading(false)
    if (res.success) {
      toast.success(`Etapa "${name.trim()}" creada`)
      setOpen(false)
      setName("")
      setColorIdx(0)
      onCreated()
    } else {
      toast.error(res.error)
    }
  }

  if (disabled) return null

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex flex-col items-center justify-center w-[64px] min-h-[120px] flex-shrink-0 rounded-[12px] border-2 border-dashed border-line-soft hover:border-indigo-300 hover:bg-indigo-50/50 transition-colors gap-1.5 text-ink-tertiary hover:text-indigo-500"
        title="Agregar etapa"
      >
        <Plus className="w-4 h-4" />
        <span className="text-[10px] font-medium text-center leading-tight px-1">Agregar etapa</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative bg-surface rounded-2xl shadow-2xl w-full max-w-sm border border-line-soft overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-line-subtle">
              <h2 className="text-sm font-semibold text-ink-primary">Nueva etapa del pipeline</h2>
              <button onClick={() => setOpen(false)} className="text-ink-tertiary hover:text-ink-secondary">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <div className="px-5 py-4 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-ink-secondary">Nombre de la etapa *</label>
                <input
                  type="text"
                  autoFocus
                  placeholder="Ej: En seguimiento, Evaluación…"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleCreate()}
                  maxLength={40}
                  className="w-full h-9 px-3 text-sm border border-line-soft rounded-lg bg-canvas text-ink-primary focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-ink-secondary">Color de la etapa</label>
                <div className="flex gap-2 flex-wrap">
                  {CUSTOM_STAGE_COLORS.map((c, i) => (
                    <button
                      key={c.name}
                      title={c.name}
                      onClick={() => setColorIdx(i)}
                      className="w-6 h-6 rounded-full transition-transform hover:scale-110 ring-offset-1"
                      style={{
                        backgroundColor: c.color,
                        outline: colorIdx === i ? `2px solid ${c.color}` : 'none',
                        outlineOffset: '2px',
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Preview */}
              {name.trim() && (
                <div className="space-y-1">
                  <label className="text-xs font-medium text-ink-secondary">Vista previa</label>
                  <div
                    className="rounded-[10px] px-3 py-2 flex items-center gap-2 border"
                    style={{
                      background: selected.header,
                      borderColor: selected.color + '40',
                    }}
                  >
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ background: selected.color }}
                    />
                    <span className="text-sm font-semibold" style={{ color: selected.color }}>
                      {name.trim()}
                    </span>
                    <span className="ml-auto text-[11px] font-medium px-1.5 py-0.5 rounded-full bg-white/60" style={{ color: selected.color }}>
                      0
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex gap-2 px-5 py-4 border-t border-line-subtle bg-canvas">
              <button
                onClick={() => setOpen(false)}
                className="flex-1 h-9 text-sm border border-line-soft rounded-lg text-ink-secondary hover:bg-inset transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreate}
                disabled={loading || name.trim().length < 2}
                className="flex-1 h-9 text-sm font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5"
              >
                {loading ? "Creando…" : (<><Plus className="w-3.5 h-3.5" /> Crear etapa</>)}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
