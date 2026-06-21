"use client"

import { useState, useTransition } from "react"
import { Loader2, Plus, Trash2, BookOpen } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { uploadKnowledgeDocument, removeKnowledgeDocument } from "@/lib/actions/knowledge-base"

type SourceType = "TEXTO_MANUAL" | "FAQ" | "TESTIMONIOS" | "GUION_OBJECIONES"

const SOURCE_LABELS: Record<SourceType, string> = {
  TEXTO_MANUAL:     "Texto general",
  FAQ:               "Preguntas frecuentes",
  TESTIMONIOS:       "Testimonios",
  GUION_OBJECIONES: "Guión de objeciones",
}

export type KnowledgeDoc = {
  id:         string
  title:      string
  sourceType: SourceType
  createdAt:  Date
  _count:     { chunks: number }
}

export function KnowledgeBaseUpload({ initialDocuments }: { initialDocuments: KnowledgeDoc[] }) {
  const [documents, setDocuments] = useState(initialDocuments)
  const [title, setTitle] = useState("")
  const [sourceType, setSourceType] = useState<SourceType>("TEXTO_MANUAL")
  const [content, setContent] = useState("")
  const [isPending, startTransition] = useTransition()

  function handleAdd() {
    if (!title.trim() || content.trim().length < 20) {
      toast.error("Completa el título y al menos 20 caracteres de contenido")
      return
    }
    startTransition(async () => {
      const result = await uploadKnowledgeDocument({ title: title.trim(), sourceType, content: content.trim() })
      if (result.success) {
        toast.success(`Documento agregado (${result.chunksCreated} fragmentos indexados)`)
        setDocuments((prev) => [
          { id: result.documentId, title: title.trim(), sourceType, createdAt: new Date(), _count: { chunks: result.chunksCreated } },
          ...prev,
        ])
        setTitle("")
        setContent("")
      } else {
        toast.error(result.error)
      }
    })
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      const result = await removeKnowledgeDocument(id)
      if (result.success) {
        setDocuments((prev) => prev.filter((d) => d.id !== id))
      } else {
        toast.error(result.error)
      }
    })
  }

  return (
    <div className="bg-surface border border-line-subtle rounded-[12px] p-5 shadow-card space-y-4">
      <div className="flex items-center gap-2">
        <BookOpen className="w-4 h-4 text-brand-600" />
        <div>
          <h3 className="text-[14px] font-bold text-ink-primary">Base de conocimiento</h3>
          <p className="text-[12px] text-ink-tertiary mt-0.5">
            El agente busca el fragmento más relevante de estos documentos antes de responder — no inventa datos.
          </p>
        </div>
      </div>

      {documents.length > 0 && (
        <div className="space-y-2">
          {documents.map((doc) => (
            <div key={doc.id} className="flex items-center justify-between px-3 py-2 rounded-lg border border-line-subtle">
              <div>
                <p className="text-[13px] font-medium text-ink-primary">{doc.title}</p>
                <p className="text-[11px] text-ink-tertiary">
                  {SOURCE_LABELS[doc.sourceType]} · {doc._count.chunks} fragmentos
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleDelete(doc.id)}
                disabled={isPending}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-ink-tertiary hover:bg-inset hover:text-red-500"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-2 border-t border-line-subtle pt-4">
        <p className="text-[11px] font-medium text-ink-tertiary uppercase tracking-wide">Agregar documento</p>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ej: Catálogo de precios 2026"
          className="w-full h-9 rounded-lg border border-line-subtle bg-transparent px-2.5 text-[13px] text-ink-primary outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
        />
        <select
          value={sourceType}
          onChange={(e) => setSourceType(e.target.value as SourceType)}
          className="w-full h-9 rounded-lg border border-line-subtle bg-transparent px-2.5 text-[13px] text-ink-primary outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
        >
          {Object.entries(SOURCE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={6}
          maxLength={20000}
          placeholder="Pega aquí el contenido (precios, preguntas frecuentes, objeciones comunes y cómo resolverlas, testimonios reales...)"
          className="text-[13px]"
        />
        <Button type="button" onClick={handleAdd} disabled={isPending} className="w-full">
          {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
          Agregar a la base de conocimiento
        </Button>
      </div>
    </div>
  )
}
