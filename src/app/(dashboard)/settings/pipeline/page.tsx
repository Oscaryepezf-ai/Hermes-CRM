"use client"

import { useState, useEffect } from "react"
import { GripVertical, Lock, Pencil, Trash2, Plus, Check, X } from "lucide-react"
import { toast } from "sonner"
import {
  fetchClinicStages, createCustomStage,
  renameClinicStage, deleteClinicStage, reorderClinicStages,
} from "@/lib/actions/stages"
import { AddStageButton } from "@/components/pipeline/AddStageButton"
import { CUSTOM_STAGE_COLORS } from "@/lib/pipeline/default-stages"

type Stage = {
  id:            string
  name:          string
  slug:          string
  color:         string
  bgColor:       string
  headerBgColor: string
  order:         number
  isProtected:   boolean
  isCustom:      boolean
  _count:        { leads: number }
}

export default function PipelineSettingsPage() {
  const [stages,   setStages]   = useState<Stage[]>([])
  const [loading,  setLoading]  = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName,  setEditName]  = useState("")
  const [dragOver,  setDragOver]  = useState<string | null>(null)
  const [dragging,  setDragging]  = useState<string | null>(null)

  const loadStages = () => {
    fetchClinicStages().then(res => {
      if (res.success) setStages(res.data as Stage[])
      setLoading(false)
    })
  }

  useEffect(() => { loadStages() }, [])

  const handleRenameSubmit = async (stageId: string) => {
    if (editName.trim().length < 2) { toast.error("Nombre muy corto"); return }
    const res = await renameClinicStage(stageId, editName.trim())
    if (res.success) {
      toast.success("Etapa renombrada")
      setEditingId(null)
      loadStages()
    } else {
      toast.error(res.error)
    }
  }

  const handleDragStart = (id: string) => setDragging(id)
  const handleDragEnd   = async () => {
    setDragging(null)
    setDragOver(null)
    if (!dragging || !dragOver || dragging === dragOver) return

    const from = stages.findIndex(s => s.id === dragging)
    const to   = stages.findIndex(s => s.id === dragOver)
    if (from === -1 || to === -1) return

    const newStages = [...stages]
    const [moved] = newStages.splice(from, 1)
    newStages.splice(to, 0, moved)
    setStages(newStages)

    const res = await reorderClinicStages(newStages.map(s => s.id))
    if (!res.success) {
      toast.error(res.error)
      loadStages()
    }
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <p className="text-sm text-ink-tertiary">Cargando etapas…</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-ink-primary">Pipeline de pacientes</h1>
          <p className="text-sm text-ink-tertiary mt-0.5">
            Configura las etapas de tu flujo de trabajo
          </p>
        </div>
        <AddStageButton
          insertAfterOrder={stages.filter(s => !s.isProtected).length}
          disabled={stages.length >= 12}
          onCreated={loadStages}
        />
      </div>

      {/* Stage list */}
      <div className="space-y-2">
        {stages.map(stage => (
          <div
            key={stage.id}
            draggable={!stage.isProtected}
            onDragStart={() => handleDragStart(stage.id)}
            onDragOver={e => { e.preventDefault(); setDragOver(stage.id) }}
            onDragEnd={handleDragEnd}
            className={`flex items-center gap-3 bg-surface rounded-xl border px-4 py-3 transition-all ${
              dragOver === stage.id && dragging !== stage.id
                ? 'border-indigo-400 bg-indigo-50/50'
                : 'border-line-soft'
            } ${stage.isProtected ? 'opacity-80' : ''}`}
          >
            {/* Drag handle */}
            <div className={`text-ink-disabled flex-shrink-0 ${stage.isProtected ? 'opacity-30 cursor-not-allowed' : 'cursor-grab'}`}>
              <GripVertical className="w-4 h-4" />
            </div>

            {/* Color dot */}
            <span
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: stage.color }}
            />

            {/* Name */}
            <div className="flex-1 min-w-0">
              {editingId === stage.id ? (
                <div className="flex items-center gap-2">
                  <input
                    autoFocus
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleRenameSubmit(stage.id)
                      if (e.key === 'Escape') setEditingId(null)
                    }}
                    className="flex-1 h-7 px-2 text-sm border border-indigo-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-canvas"
                    maxLength={40}
                  />
                  <button onClick={() => handleRenameSubmit(stage.id)} className="text-emerald-600 hover:text-emerald-700">
                    <Check className="w-4 h-4" />
                  </button>
                  <button onClick={() => setEditingId(null)} className="text-red-400 hover:text-red-500">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-ink-primary">{stage.name}</span>
                  {stage.isProtected && (
                    <span className="inline-flex items-center gap-1 text-[10px] text-ink-tertiary">
                      <Lock className="w-2.5 h-2.5" /> Protegida
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Lead count */}
            <span className="text-xs text-ink-tertiary flex-shrink-0">
              {stage._count.leads} lead{stage._count.leads !== 1 ? 's' : ''}
            </span>

            {/* Actions */}
            {!stage.isProtected && editingId !== stage.id && (
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => { setEditingId(stage.id); setEditName(stage.name) }}
                  className="p-1.5 rounded-lg hover:bg-canvas text-ink-tertiary hover:text-ink-secondary transition-colors"
                  title="Renombrar"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Footer note */}
      <p className="text-xs text-ink-tertiary text-center">
        Máximo 12 etapas. Actualmente: {stages.length} de 12.
        {' '}Las etapas protegidas no se pueden eliminar ni renombrar.
      </p>
    </div>
  )
}
