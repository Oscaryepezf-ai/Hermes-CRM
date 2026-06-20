"use client"

import { useRef, useState, useTransition } from "react"
import { Loader2, Upload, Trash2, FileText, Image as ImageIcon, File as FileIcon, Download } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { formatDate, cn } from "@/lib/utils"
import { uploadPatientFile, deletePatientFile } from "@/lib/actions/files"
import { FILE_CATEGORY_OPTIONS } from "@/types/files"
import type { PatientFileWithUploader } from "@/types/files"

interface ArchivosTabProps {
  leadId: string
  files: PatientFileWithUploader[]
}

function formatSize(bytes: number | null): string {
  if (!bytes) return ""
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function FileTypeIcon({ mimeType }: { mimeType: string | null }) {
  if (mimeType?.startsWith("image/")) return <ImageIcon className="w-4 h-4 text-brand-500" />
  if (mimeType === "application/pdf") return <FileText className="w-4 h-4 text-red-500" />
  return <FileIcon className="w-4 h-4 text-ink-tertiary" />
}

export function ArchivosTab({ leadId, files: initial }: ArchivosTabProps) {
  const [files, setFiles] = useState(initial)
  const [category, setCategory] = useState("")
  const [notes, setNotes] = useState("")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isPending, startTransition] = useTransition()
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    setSelectedFile(e.target.files?.[0] ?? null)
  }

  function handleUpload() {
    if (!selectedFile) {
      toast.error("Selecciona un archivo")
      return
    }
    const formData = new FormData()
    formData.set("leadId", leadId)
    formData.set("category", category)
    formData.set("notes", notes)
    formData.set("file", selectedFile)

    startTransition(async () => {
      const result = await uploadPatientFile(formData)
      if (result.success) {
        toast.success("Archivo subido")
        setFiles((prev) => [result.data, ...prev])
        setSelectedFile(null)
        setCategory("")
        setNotes("")
        if (fileInputRef.current) fileInputRef.current.value = ""
      } else {
        toast.error(result.error)
      }
    })
  }

  async function handleDelete(id: string) {
    const result = await deletePatientFile(id)
    if (result.success) {
      setFiles((prev) => prev.filter((f) => f.id !== id))
      toast.success("Archivo eliminado")
    } else {
      toast.error(result.error)
    }
  }

  return (
    <div className="space-y-4">
      <div className="bg-surface border border-line-subtle rounded-[12px] p-5 shadow-card space-y-3">
        <h3 className="text-[14px] font-bold text-ink-primary">Subir archivo</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileSelected}
              className="w-full text-[13px] text-ink-secondary file:mr-3 file:h-9 file:rounded-lg file:border file:border-line-subtle file:bg-inset file:px-3 file:text-[12px] file:font-medium file:text-ink-primary file:cursor-pointer"
            />
          </div>
          <select
            className="h-9 rounded-lg border border-line-subtle bg-transparent px-2.5 text-[13px] text-ink-primary outline-none"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">Categoría (opcional)</option>
            {FILE_CATEGORY_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
          <input
            className="h-9 rounded-lg border border-line-subtle bg-transparent px-2.5 text-[13px] text-ink-primary outline-none"
            placeholder="Notas (opcional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
        <div className="flex justify-end">
          <Button onClick={handleUpload} disabled={isPending || !selectedFile}>
            {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
            Subir archivo
          </Button>
        </div>
      </div>

      <div className="bg-surface border border-line-subtle rounded-[12px] p-5 shadow-card">
        <h3 className="text-[14px] font-bold text-ink-primary mb-3">Archivos del paciente</h3>
        {files.length === 0 ? (
          <p className="text-[13px] text-ink-tertiary text-center py-4">Sin archivos cargados</p>
        ) : (
          <div className="space-y-3">
            {files.map((f, idx) => (
              <div key={f.id}>
                {idx > 0 && <div className="border-t border-line-subtle mb-3" />}
                <div className="flex items-start gap-3">
                  <div className={cn("w-9 h-9 rounded-[10px] bg-inset flex items-center justify-center flex-shrink-0")}>
                    <FileTypeIcon mimeType={f.mimeType} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-ink-primary truncate">{f.fileName}</p>
                    <p className="text-[11px] text-ink-tertiary mt-0.5">
                      {[f.category, formatSize(f.sizeBytes), formatDate(f.createdAt)].filter(Boolean).join(" · ")}
                      {" · "}Subido por {f.uploadedBy.name}
                    </p>
                    {f.notes && (
                      <p className="text-[11px] text-ink-tertiary mt-1 bg-inset rounded px-2 py-1">{f.notes}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <a
                      href={f.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-inset transition-colors"
                      title="Descargar / ver"
                    >
                      <Download className="w-3.5 h-3.5 text-ink-tertiary" />
                    </a>
                    <button
                      onClick={() => handleDelete(f.id)}
                      className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-inset transition-colors"
                      title="Eliminar"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-ink-tertiary" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
