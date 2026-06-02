"use client"

import { useState } from "react"
import { MoreHorizontal, Pencil, Trash2, ChevronLeft, ChevronRight, X } from "lucide-react"
import { toast } from "sonner"
import { deleteClinicStage, renameClinicStage } from "@/lib/actions/stages"

type Stage = { id: string; name: string; isProtected: boolean; _count?: { leads: number } }

interface StageOptionsMenuProps {
  stage:       Stage
  allStages:   Stage[]
  canMoveLeft: boolean
  canMoveRight: boolean
  onRename:    () => void
  onMoveLeft:  () => void
  onMoveRight: () => void
  onDeleted:   () => void
}

export function StageOptionsMenu({
  stage, allStages, canMoveLeft, canMoveRight,
  onRename, onMoveLeft, onMoveRight, onDeleted,
}: StageOptionsMenuProps) {
  const [open,          setOpen]          = useState(false)
  const [showDelete,    setShowDelete]    = useState(false)
  const [moveLeadsToId, setMoveLeadsToId] = useState("")
  const [deleting,      setDeleting]      = useState(false)

  if (stage.isProtected) return null

  const otherStages = allStages.filter(s => s.id !== stage.id && !s.isProtected)
  const leadsCount  = stage._count?.leads ?? 0

  const handleDelete = async () => {
    if (leadsCount > 0 && !moveLeadsToId) {
      toast.error("Selecciona a dónde mover los leads")
      return
    }
    setDeleting(true)
    const targetId = moveLeadsToId || allStages.find(s => s.id !== stage.id)!.id
    const res = await deleteClinicStage(stage.id, targetId)
    setDeleting(false)
    if (res.success) {
      toast.success(`Etapa "${stage.name}" eliminada`)
      setShowDelete(false)
      setOpen(false)
      onDeleted()
    } else {
      toast.error(res.error)
    }
  }

  return (
    <div className="relative" onClick={e => e.stopPropagation()}>
      <button
        onClick={() => setOpen(!open)}
        className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-black/10 text-current opacity-70 hover:opacity-100 transition-opacity"
      >
        <MoreHorizontal className="w-3.5 h-3.5" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => { setOpen(false); setShowDelete(false) }} />
          <div className="absolute right-0 top-7 z-40 bg-surface border border-line-soft rounded-xl shadow-xl w-48 py-1 text-sm">
            <button
              onClick={() => { onRename(); setOpen(false) }}
              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-canvas text-ink-secondary"
            >
              <Pencil className="w-3.5 h-3.5" />
              Renombrar
            </button>

            <div className="h-px bg-line-subtle mx-2 my-1" />

            <button
              onClick={() => { onMoveLeft(); setOpen(false) }}
              disabled={!canMoveLeft}
              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-canvas text-ink-secondary disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Mover a la izquierda
            </button>
            <button
              onClick={() => { onMoveRight(); setOpen(false) }}
              disabled={!canMoveRight}
              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-canvas text-ink-secondary disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-3.5 h-3.5" />
              Mover a la derecha
            </button>

            <div className="h-px bg-line-subtle mx-2 my-1" />

            <button
              onClick={() => setShowDelete(true)}
              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-red-50 text-red-500"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Eliminar etapa
            </button>
          </div>
        </>
      )}

      {/* Delete confirmation */}
      {showDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowDelete(false)} />
          <div className="relative bg-surface rounded-2xl shadow-2xl w-full max-w-sm border border-line-soft p-5">
            <button onClick={() => setShowDelete(false)} className="absolute top-4 right-4 text-ink-tertiary hover:text-ink-secondary">
              <X className="w-4 h-4" />
            </button>
            <h3 className="font-semibold text-ink-primary text-sm mb-1">
              ¿Eliminar "{stage.name}"?
            </h3>
            {leadsCount > 0 ? (
              <>
                <p className="text-xs text-ink-secondary mb-3">
                  Los {leadsCount} lead{leadsCount > 1 ? 's' : ''} en esta etapa se moverán a:
                </p>
                <select
                  className="w-full h-9 px-3 text-sm border border-line-soft rounded-lg bg-canvas text-ink-primary mb-4 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={moveLeadsToId}
                  onChange={e => setMoveLeadsToId(e.target.value)}
                >
                  <option value="">Selecciona una etapa…</option>
                  {otherStages.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </>
            ) : (
              <p className="text-xs text-ink-secondary mb-4">
                Esta etapa no tiene leads. Se eliminará definitivamente.
              </p>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => setShowDelete(false)}
                className="flex-1 h-9 text-sm border border-line-soft rounded-lg text-ink-secondary hover:bg-canvas transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting || (leadsCount > 0 && !moveLeadsToId)}
                className="flex-1 h-9 text-sm font-semibold bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 transition-colors"
              >
                {deleting ? "Eliminando…" : "Eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
