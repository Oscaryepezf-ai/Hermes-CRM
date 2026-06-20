"use client"

import { useState, useTransition } from "react"
import { Loader2, Plus, Trash2, Printer, X } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { formatDate } from "@/lib/utils"
import { createPrescription, deletePrescription } from "@/lib/actions/prescriptions"
import { EMPTY_MEDICATION_LINE } from "@/types/prescriptions"
import type { MedicationLine, PrescriptionWithDoctor } from "@/types/prescriptions"

interface PrescriptionsTabProps {
  leadId: string
  patientName: string
  clinicName: string
  prescriptions: PrescriptionWithDoctor[]
}

export function PrescriptionsTab({ leadId, patientName, clinicName, prescriptions: initial }: PrescriptionsTabProps) {
  const [prescriptions, setPrescriptions] = useState(initial)
  const [showDialog, setShowDialog] = useState(false)

  function handleCreated(p: PrescriptionWithDoctor) {
    setPrescriptions((prev) => [p, ...prev])
    setShowDialog(false)
  }

  async function handleDelete(id: string) {
    const result = await deletePrescription(id)
    if (result.success) {
      setPrescriptions((prev) => prev.filter((p) => p.id !== id))
      toast.success("Receta eliminada")
    } else {
      toast.error(result.error)
    }
  }

  return (
    <div className="space-y-4">
      <div className="bg-surface border border-line-subtle rounded-[12px] p-5 shadow-card space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-[14px] font-bold text-ink-primary">Recetas emitidas</h3>
          <Button size="sm" onClick={() => setShowDialog(true)}>
            <Plus className="w-3.5 h-3.5" />
            Nueva receta
          </Button>
        </div>

        {prescriptions.length === 0 ? (
          <p className="text-[13px] text-ink-tertiary text-center py-4">Sin recetas registradas</p>
        ) : (
          <div className="space-y-3">
            {prescriptions.map((p, idx) => {
              const meds = (p.medications as unknown as MedicationLine[]) ?? []
              return (
                <div key={p.id}>
                  {idx > 0 && <div className="border-t border-line-subtle mb-3" />}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-ink-primary">{formatDate(p.issuedAt)}</p>
                      {p.diagnosis && (
                        <p className="text-[11px] text-ink-tertiary mt-0.5">Dx: {p.diagnosis}</p>
                      )}
                      <ul className="mt-1.5 space-y-0.5">
                        {meds.map((m, i) => (
                          <li key={i} className="text-[12px] text-ink-secondary">
                            {m.name} — {m.dose}, {m.frequency}, {m.duration}
                          </li>
                        ))}
                      </ul>
                      <p className="text-[11px] text-ink-tertiary mt-1">Dr. {p.doctor.name}</p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => printPrescription(p, clinicName, patientName)}
                        className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-inset transition-colors"
                        title="Imprimir"
                      >
                        <Printer className="w-3.5 h-3.5 text-ink-tertiary" />
                      </button>
                      <button
                        onClick={() => handleDelete(p.id)}
                        className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-inset transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-ink-tertiary" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {showDialog && (
        <NewPrescriptionDialog leadId={leadId} onClose={() => setShowDialog(false)} onCreated={handleCreated} />
      )}
    </div>
  )
}

function NewPrescriptionDialog({ leadId, onClose, onCreated }: {
  leadId: string
  onClose: () => void
  onCreated: (p: PrescriptionWithDoctor) => void
}) {
  const [diagnosis, setDiagnosis] = useState("")
  const [instructions, setInstructions] = useState("")
  const [medications, setMedications] = useState<MedicationLine[]>([{ ...EMPTY_MEDICATION_LINE }])
  const [isPending, startTransition] = useTransition()

  function updateLine(idx: number, field: keyof MedicationLine, value: string) {
    setMedications((prev) => prev.map((m, i) => (i === idx ? { ...m, [field]: value } : m)))
  }

  function addLine() {
    setMedications((prev) => [...prev, { ...EMPTY_MEDICATION_LINE }])
  }

  function removeLine(idx: number) {
    setMedications((prev) => prev.filter((_, i) => i !== idx))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const cleaned = medications.filter((m) => m.name.trim() !== "")
    if (cleaned.length === 0) {
      toast.error("Agrega al menos un medicamento")
      return
    }
    startTransition(async () => {
      const result = await createPrescription({
        leadId,
        diagnosis: diagnosis || undefined,
        instructions: instructions || undefined,
        medications: cleaned,
      })
      if (result.success) {
        toast.success("Receta creada")
        onCreated(result.data)
      } else {
        toast.error(result.error)
      }
    })
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nueva receta</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2 max-h-[70vh] overflow-y-auto pr-1">
          <Field label="Diagnóstico">
            <textarea className={textareaClass} rows={2} value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} />
          </Field>

          <div className="space-y-2">
            <label className="text-[12px] font-medium text-ink-secondary block">Medicamentos *</label>
            {medications.map((m, idx) => (
              <div key={idx} className="border border-line-subtle rounded-lg p-2.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-ink-tertiary">Medicamento {idx + 1}</span>
                  {medications.length > 1 && (
                    <button type="button" onClick={() => removeLine(idx)} className="text-ink-tertiary hover:text-red-500">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <input className={inputClass} placeholder="Nombre del medicamento" value={m.name} onChange={(e) => updateLine(idx, "name", e.target.value)} />
                <div className="grid grid-cols-3 gap-2">
                  <input className={inputClass} placeholder="Dosis" value={m.dose} onChange={(e) => updateLine(idx, "dose", e.target.value)} />
                  <input className={inputClass} placeholder="Frecuencia" value={m.frequency} onChange={(e) => updateLine(idx, "frequency", e.target.value)} />
                  <input className={inputClass} placeholder="Duración" value={m.duration} onChange={(e) => updateLine(idx, "duration", e.target.value)} />
                </div>
              </div>
            ))}
            <button type="button" onClick={addLine} className="text-[12px] text-brand-600 font-medium flex items-center gap-1 hover:underline">
              <Plus className="w-3.5 h-3.5" />
              Agregar medicamento
            </button>
          </div>

          <Field label="Indicaciones generales">
            <textarea className={textareaClass} rows={2} value={instructions} onChange={(e) => setInstructions(e.target.value)} />
          </Field>

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" disabled={isPending}>
              {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Crear receta
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function printPrescription(p: PrescriptionWithDoctor, clinicName: string, patientName: string) {
  const meds = (p.medications as unknown as MedicationLine[]) ?? []
  const win = window.open("", "_blank", "width=800,height=900")
  if (!win) return

  const rows = meds.map((m) => `
    <tr>
      <td>${escapeHtml(m.name)}</td>
      <td>${escapeHtml(m.dose)}</td>
      <td>${escapeHtml(m.frequency)}</td>
      <td>${escapeHtml(m.duration)}</td>
    </tr>
  `).join("")

  win.document.write(`
    <html>
      <head>
        <title>Receta médica</title>
        <style>
          body { font-family: -apple-system, Arial, sans-serif; padding: 32px; color: #1a1a1a; }
          h1 { font-size: 18px; margin-bottom: 2px; }
          .meta { font-size: 12px; color: #666; margin-bottom: 16px; }
          .row { display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 6px; }
          table { width: 100%; border-collapse: collapse; margin-top: 12px; }
          th, td { border: 1px solid #ccc; padding: 6px 8px; font-size: 12px; text-align: left; }
          th { background: #f5f5f5; }
          .section { margin-top: 16px; font-size: 13px; }
          .label { font-weight: 600; font-size: 11px; color: #555; text-transform: uppercase; }
          .signature { margin-top: 48px; border-top: 1px solid #999; width: 240px; padding-top: 4px; font-size: 12px; }
        </style>
      </head>
      <body>
        <h1>${escapeHtml(clinicName)}</h1>
        <div class="meta">Receta médica · ${formatDate(p.issuedAt)}</div>
        <div class="row"><span><strong>Paciente:</strong> ${escapeHtml(patientName)}</span></div>
        ${p.diagnosis ? `<div class="section"><span class="label">Diagnóstico</span><p>${escapeHtml(p.diagnosis)}</p></div>` : ""}
        <table>
          <thead><tr><th>Medicamento</th><th>Dosis</th><th>Frecuencia</th><th>Duración</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
        ${p.instructions ? `<div class="section"><span class="label">Indicaciones</span><p>${escapeHtml(p.instructions)}</p></div>` : ""}
        <div class="signature">Dr. ${escapeHtml(p.doctor.name)}</div>
      </body>
    </html>
  `)
  win.document.close()
  win.focus()
  win.print()
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] ?? c))
}

const inputClass =
  "w-full h-9 rounded-lg border border-line-subtle bg-transparent px-2.5 text-[13px] text-ink-primary outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"

const textareaClass =
  "w-full rounded-lg border border-line-subtle bg-transparent px-2.5 py-2 text-[13px] text-ink-primary outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 resize-none"

function Field({ label, className, children }: {
  label: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={className}>
      <label className="text-[12px] font-medium text-ink-secondary block mb-1.5">{label}</label>
      {children}
    </div>
  )
}
