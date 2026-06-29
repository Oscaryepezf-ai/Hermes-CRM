"use client"

import { useRef, useState, useTransition } from "react"
import { X, Plus, Trash2, Upload, Star, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { uploadFlowAsset } from "@/lib/actions/flows"
import type { FlowNodeData } from "./FlowNodeCard"

interface FlowNodeEditorPanelProps {
  flowId:        string
  data:          FlowNodeData
  isStart:       boolean
  onChange:      (data: Partial<FlowNodeData>) => void
  onSetStart:    () => void
  onDeleteNode:  () => void
  onClose:       () => void
}

export function FlowNodeEditorPanel({ flowId, data, isStart, onChange, onSetStart, onDeleteNode, onClose }: FlowNodeEditorPanelProps) {
  const [isPending, startTransition] = useTransition()
  const fileInputRef = useRef<HTMLInputElement>(null)

  function addButton() {
    if (data.buttons.length >= 3) return
    onChange({ buttons: [...data.buttons, { id: crypto.randomUUID(), label: "", nextNodeId: null }] })
  }

  function updateButton(id: string, label: string) {
    onChange({ buttons: data.buttons.map(b => b.id === id ? { ...b, label: label.slice(0, 20) } : b) })
  }

  function removeButton(id: string) {
    onChange({ buttons: data.buttons.filter(b => b.id !== id) })
  }

  function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const formData = new FormData()
    formData.append("file", file)
    startTransition(async () => {
      const result = await uploadFlowAsset(flowId, formData)
      if (result.success) {
        onChange({ mediaUrl: result.data.url, mediaType: result.data.mediaType })
      } else {
        toast.error(result.error)
      }
    })
    e.target.value = ""
  }

  return (
    <div className="w-[320px] flex-shrink-0 bg-surface border-l border-line-subtle h-full overflow-y-auto">
      <div className="flex items-center justify-between px-4 py-3 border-b border-line-subtle">
        <h3 className="text-[13px] font-bold text-ink-primary">
          {data.kind === "MESSAGE" ? "Editar mensaje" : data.kind === "HANDOFF" ? "Mensaje de transferencia" : "Mensaje de cierre"}
        </h3>
        <button type="button" onClick={onClose} className="text-ink-tertiary hover:text-ink-primary">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 space-y-4">
        <div>
          <label className="text-[11px] font-medium text-ink-secondary block mb-1.5">Texto del mensaje</label>
          <Textarea
            value={data.text}
            onChange={(e) => onChange({ text: e.target.value.slice(0, 1000) })}
            rows={4}
            maxLength={1000}
            className="text-[13px]"
          />
        </div>

        {data.kind === "MESSAGE" && (
          <>
            <div>
              <label className="text-[11px] font-medium text-ink-secondary block mb-1.5">Imagen, video o documento (opcional)</label>
              {data.mediaUrl ? (
                <div className="flex items-center justify-between px-2.5 py-2 rounded-lg border border-line-subtle">
                  <span className="text-[12px] text-ink-secondary truncate">
                    {data.mediaType === "image" ? "Imagen adjunta" : data.mediaType === "video" ? "Video adjunto" : "Documento adjunto"}
                  </span>
                  <button type="button" onClick={() => onChange({ mediaUrl: null, mediaType: null })} className="text-ink-tertiary hover:text-red-500">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <Button type="button" variant="outline" size="sm" disabled={isPending} onClick={() => fileInputRef.current?.click()} className="w-full">
                  {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                  Subir archivo
                </Button>
              )}
              <input ref={fileInputRef} type="file" accept="image/*,video/*,.pdf" className="hidden" onChange={handleFileSelected} />
              <p className="text-[10px] text-ink-disabled mt-1">Imagen hasta 5MB, video hasta 16MB, documento hasta 20MB.</p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-medium text-ink-secondary">Botones ({data.buttons.length}/3)</label>
                <button type="button" onClick={addButton} disabled={data.buttons.length >= 3} className="text-[11px] text-brand-600 font-medium disabled:opacity-40 flex items-center gap-1">
                  <Plus className="w-3 h-3" /> Agregar
                </button>
              </div>
              <div className="space-y-2">
                {data.buttons.map((b) => (
                  <div key={b.id} className="flex items-center gap-1.5">
                    <input
                      value={b.label}
                      onChange={(e) => updateButton(b.id, e.target.value)}
                      maxLength={20}
                      placeholder="Texto del botón"
                      className="flex-1 h-8 rounded-lg border border-line-subtle bg-transparent px-2 text-[12px] text-ink-primary outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
                    />
                    <span className="text-[10px] text-ink-disabled w-7 text-right">{b.label.length}/20</span>
                    <button type="button" onClick={() => removeButton(b.id)} className="text-ink-tertiary hover:text-red-500 flex-shrink-0">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                {data.buttons.length === 0 && (
                  <p className="text-[11px] text-ink-tertiary">Sin botones, este mensaje termina el flujo al enviarse.</p>
                )}
              </div>
              <p className="text-[11px] text-ink-tertiary mt-2">
                Arrastra desde el punto a la derecha de cada botón hasta otro mensaje en el lienzo para conectarlo.
              </p>
            </div>

            <button
              type="button"
              onClick={onSetStart}
              disabled={isStart}
              className={cn(
                "w-full h-9 rounded-lg border text-[12px] font-medium flex items-center justify-center gap-1.5",
                isStart ? "bg-amber-50 border-amber-200 text-amber-700" : "border-line-subtle text-ink-secondary hover:bg-inset"
              )}
            >
              <Star className={cn("w-3.5 h-3.5", isStart && "fill-amber-500 text-amber-500")} />
              {isStart ? "Este es el mensaje inicial" : "Marcar como mensaje inicial"}
            </button>

            <button
              type="button"
              onClick={onDeleteNode}
              className="w-full h-9 rounded-lg border border-red-200 text-red-600 text-[12px] font-medium hover:bg-red-50"
            >
              Eliminar este mensaje
            </button>
          </>
        )}
      </div>
    </div>
  )
}
