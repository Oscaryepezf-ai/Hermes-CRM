"use client"

import { useState, useTransition } from "react"
import { Loader2, Plus, Trash2, X } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { formatDate, cn } from "@/lib/utils"
import { saveOrthodonticHistory, createOrthodonticVisit, deleteOrthodonticVisit } from "@/lib/actions/orthodontics"
import {
  FACIAL_TYPE_OPTIONS, SYMMETRY_OPTIONS, PROFILE_OPTIONS, LIP_COMPETENCE_OPTIONS,
  BREATHING_OPTIONS, SWALLOWING_OPTIONS, HABITS_OPTIONS, ORAL_HYGIENE_OPTIONS,
  ANGLE_CLASS_OPTIONS, MOLAR_RELATION_OPTIONS, CANINE_RELATION_OPTIONS,
  MIDLINE_DEVIATION_OPTIONS, CROSSBITE_OPTIONS, CURVE_OF_SPEE_OPTIONS,
  SKELETAL_CLASS_OPTIONS, TREATMENT_PHASE_OPTIONS, APPLIANCE_TYPE_OPTIONS,
} from "@/types/orthodontics"
import type { OrthodonticFields, OrthodonticHistoryWithLead, OrthodonticVisitWithDoctor, OrthodonticVisitFields } from "@/types/orthodontics"

function numToStr(n: number | null): string {
  return n === null || n === undefined ? "" : String(n)
}

function strToNum(s: string): number | undefined {
  if (s.trim() === "") return undefined
  const n = Number(s)
  return Number.isNaN(n) ? undefined : n
}

function toFormState(history: OrthodonticHistoryWithLead): OrthodonticFields {
  return {
    chiefComplaint: history.chiefComplaint ?? "",
    priorOrthoTreatment: history.priorOrthoTreatment ?? "",

    facialType: history.facialType ?? "",
    facialSymmetry: history.facialSymmetry ?? "",
    profileType: history.profileType ?? "",
    lipCompetence: history.lipCompetence ?? "",
    nasolabialAngle: history.nasolabialAngle ?? "",
    facialNotes: history.facialNotes ?? "",

    breathingType: history.breathingType ?? "",
    swallowingType: history.swallowingType ?? "",
    habits: history.habits ?? [],
    tmjFindings: history.tmjFindings ?? "",
    functionalNotes: history.functionalNotes ?? "",

    angleClassRight: history.angleClassRight ?? "",
    angleClassLeft: history.angleClassLeft ?? "",
    molarRelationRight: history.molarRelationRight ?? "",
    molarRelationLeft: history.molarRelationLeft ?? "",
    canineRelationRight: history.canineRelationRight ?? "",
    canineRelationLeft: history.canineRelationLeft ?? "",
    overjetMm: numToStr(history.overjetMm),
    overbiteMm: numToStr(history.overbiteMm),
    upperMidlineDeviation: history.upperMidlineDeviation ?? "",
    lowerMidlineDeviation: history.lowerMidlineDeviation ?? "",
    crowdingUpperMm: numToStr(history.crowdingUpperMm),
    crowdingLowerMm: numToStr(history.crowdingLowerMm),
    spacingUpperMm: numToStr(history.spacingUpperMm),
    spacingLowerMm: numToStr(history.spacingLowerMm),
    crossbite: history.crossbite ?? [],
    openBite: history.openBite ?? false,
    curveOfSpee: history.curveOfSpee ?? "",
    missingTeeth: history.missingTeeth ?? "",
    impactedTeeth: history.impactedTeeth ?? "",
    occlusalNotes: history.occlusalNotes ?? "",

    snaAngle: numToStr(history.snaAngle),
    snbAngle: numToStr(history.snbAngle),
    anbAngle: numToStr(history.anbAngle),
    fmaAngle: numToStr(history.fmaAngle),
    skeletalClass: history.skeletalClass ?? "",
    cephalometricNotes: history.cephalometricNotes ?? "",

    skeletalDiagnosis: history.skeletalDiagnosis ?? "",
    dentalDiagnosis: history.dentalDiagnosis ?? "",
    functionalDiagnosis: history.functionalDiagnosis ?? "",

    treatmentPhase: history.treatmentPhase ?? "",
    applianceType: history.applianceType ?? "",
    extractionsPlanned: history.extractionsPlanned ?? "",
    treatmentObjectives: history.treatmentObjectives ?? "",
    estimatedDurationMonths: numToStr(history.estimatedDurationMonths),
  }
}

interface OrthodonticsFormProps {
  leadId: string
  history: OrthodonticHistoryWithLead
  visits: OrthodonticVisitWithDoctor[]
}

export function OrthodonticsForm({ leadId, history, visits: initialVisits }: OrthodonticsFormProps) {
  const [form, setForm] = useState<OrthodonticFields>(() => toFormState(history))
  const [savedAt, setSavedAt] = useState<Date>(new Date(history.updatedAt))
  const [visits, setVisits] = useState(initialVisits)
  const [showVisitDialog, setShowVisitDialog] = useState(false)
  const [isPending, startTransition] = useTransition()

  function set<K extends keyof OrthodonticFields>(key: K, value: OrthodonticFields[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function toggleListValue(key: "habits" | "crossbite", value: string) {
    setForm((prev) => {
      const list = prev[key]
      const next = list.includes(value) ? list.filter((v) => v !== value) : [...list, value]
      return { ...prev, [key]: next }
    })
  }

  function handleSave() {
    startTransition(async () => {
      const result = await saveOrthodonticHistory({
        leadId,
        ...form,
        overjetMm: strToNum(form.overjetMm),
        overbiteMm: strToNum(form.overbiteMm),
        crowdingUpperMm: strToNum(form.crowdingUpperMm),
        crowdingLowerMm: strToNum(form.crowdingLowerMm),
        spacingUpperMm: strToNum(form.spacingUpperMm),
        spacingLowerMm: strToNum(form.spacingLowerMm),
        snaAngle: strToNum(form.snaAngle),
        snbAngle: strToNum(form.snbAngle),
        anbAngle: strToNum(form.anbAngle),
        fmaAngle: strToNum(form.fmaAngle),
        estimatedDurationMonths: strToNum(form.estimatedDurationMonths),
      })
      if (result.success) {
        toast.success("Historia de ortodoncia guardada")
        setSavedAt(new Date(result.data.updatedAt))
      } else {
        toast.error(result.error)
      }
    })
  }

  function handleVisitCreated(visit: OrthodonticVisitWithDoctor) {
    setVisits((prev) => [visit, ...prev])
    setShowVisitDialog(false)
  }

  async function handleDeleteVisit(id: string) {
    const result = await deleteOrthodonticVisit(id)
    if (result.success) {
      setVisits((prev) => prev.filter((v) => v.id !== id))
      toast.success("Control eliminado")
    } else {
      toast.error(result.error)
    }
  }

  return (
    <div className="space-y-4">
      <SectionCard title="Motivo de consulta y antecedentes">
        <div className="grid grid-cols-1 gap-4">
          <Field label="Motivo de consulta" className="col-span-1">
            <textarea className={textareaClass} rows={2} value={form.chiefComplaint} onChange={(e) => set("chiefComplaint", e.target.value)} />
          </Field>
          <Field label="Tratamiento de ortodoncia previo">
            <textarea className={textareaClass} rows={2} value={form.priorOrthoTreatment} onChange={(e) => set("priorOrthoTreatment", e.target.value)} />
          </Field>
        </div>
      </SectionCard>

      <SectionCard title="Análisis facial (extraoral)">
        <div className="grid grid-cols-3 gap-4">
          <SelectField label="Tipo facial" value={form.facialType} onChange={(v) => set("facialType", v)} options={FACIAL_TYPE_OPTIONS} />
          <SelectField label="Simetría facial" value={form.facialSymmetry} onChange={(v) => set("facialSymmetry", v)} options={SYMMETRY_OPTIONS} />
          <SelectField label="Perfil" value={form.profileType} onChange={(v) => set("profileType", v)} options={PROFILE_OPTIONS} />
          <SelectField label="Sellado labial" value={form.lipCompetence} onChange={(v) => set("lipCompetence", v)} options={LIP_COMPETENCE_OPTIONS} />
          <Field label="Ángulo nasolabial">
            <input className={inputClass} placeholder="Ej. 100°" value={form.nasolabialAngle} onChange={(e) => set("nasolabialAngle", e.target.value)} />
          </Field>
          <Field label="Notas faciales" className="col-span-3">
            <textarea className={textareaClass} rows={2} value={form.facialNotes} onChange={(e) => set("facialNotes", e.target.value)} />
          </Field>
        </div>
      </SectionCard>

      <SectionCard title="Análisis funcional">
        <div className="grid grid-cols-3 gap-4">
          <SelectField label="Tipo de respiración" value={form.breathingType} onChange={(v) => set("breathingType", v)} options={BREATHING_OPTIONS} />
          <SelectField label="Deglución" value={form.swallowingType} onChange={(v) => set("swallowingType", v)} options={SWALLOWING_OPTIONS} />
          <div />
          <Field label="Hábitos" className="col-span-3">
            <CheckboxGroup options={HABITS_OPTIONS} selected={form.habits} onToggle={(v) => toggleListValue("habits", v)} />
          </Field>
          <Field label="Hallazgos de ATM" className="col-span-3">
            <textarea className={textareaClass} rows={2} placeholder="Clicks, dolor, limitación de apertura..." value={form.tmjFindings} onChange={(e) => set("tmjFindings", e.target.value)} />
          </Field>
          <Field label="Notas funcionales" className="col-span-3">
            <textarea className={textareaClass} rows={2} value={form.functionalNotes} onChange={(e) => set("functionalNotes", e.target.value)} />
          </Field>
        </div>
      </SectionCard>

      <SectionCard title="Análisis dental y oclusal (intraoral)">
        <div className="grid grid-cols-3 gap-4">
          <SelectField label="Clase de Angle derecha" value={form.angleClassRight} onChange={(v) => set("angleClassRight", v)} options={ANGLE_CLASS_OPTIONS} />
          <SelectField label="Clase de Angle izquierda" value={form.angleClassLeft} onChange={(v) => set("angleClassLeft", v)} options={ANGLE_CLASS_OPTIONS} />
          <div />

          <SelectField label="Relación molar derecha" value={form.molarRelationRight} onChange={(v) => set("molarRelationRight", v)} options={MOLAR_RELATION_OPTIONS} />
          <SelectField label="Relación molar izquierda" value={form.molarRelationLeft} onChange={(v) => set("molarRelationLeft", v)} options={MOLAR_RELATION_OPTIONS} />
          <div />

          <SelectField label="Relación canina derecha" value={form.canineRelationRight} onChange={(v) => set("canineRelationRight", v)} options={CANINE_RELATION_OPTIONS} />
          <SelectField label="Relación canina izquierda" value={form.canineRelationLeft} onChange={(v) => set("canineRelationLeft", v)} options={CANINE_RELATION_OPTIONS} />
          <div />

          <Field label="Overjet (resalte, mm)">
            <input type="number" step="0.1" className={inputClass} value={form.overjetMm} onChange={(e) => set("overjetMm", e.target.value)} />
          </Field>
          <Field label="Overbite (sobremordida, mm)">
            <input type="number" step="0.1" className={inputClass} value={form.overbiteMm} onChange={(e) => set("overbiteMm", e.target.value)} />
          </Field>
          <SelectField label="Curva de Spee" value={form.curveOfSpee} onChange={(v) => set("curveOfSpee", v)} options={CURVE_OF_SPEE_OPTIONS} />

          <SelectField label="Línea media superior" value={form.upperMidlineDeviation} onChange={(v) => set("upperMidlineDeviation", v)} options={MIDLINE_DEVIATION_OPTIONS} />
          <SelectField label="Línea media inferior" value={form.lowerMidlineDeviation} onChange={(v) => set("lowerMidlineDeviation", v)} options={MIDLINE_DEVIATION_OPTIONS} />
          <div />

          <Field label="Apiñamiento superior (mm)">
            <input type="number" step="0.1" className={inputClass} value={form.crowdingUpperMm} onChange={(e) => set("crowdingUpperMm", e.target.value)} />
          </Field>
          <Field label="Apiñamiento inferior (mm)">
            <input type="number" step="0.1" className={inputClass} value={form.crowdingLowerMm} onChange={(e) => set("crowdingLowerMm", e.target.value)} />
          </Field>
          <div />

          <Field label="Espaciamiento superior (mm)">
            <input type="number" step="0.1" className={inputClass} value={form.spacingUpperMm} onChange={(e) => set("spacingUpperMm", e.target.value)} />
          </Field>
          <Field label="Espaciamiento inferior (mm)">
            <input type="number" step="0.1" className={inputClass} value={form.spacingLowerMm} onChange={(e) => set("spacingLowerMm", e.target.value)} />
          </Field>
          <div className="flex items-end pb-1.5">
            <label className="flex items-center gap-2 text-[13px] text-ink-primary cursor-pointer">
              <input type="checkbox" checked={form.openBite} onChange={(e) => set("openBite", e.target.checked)} className="w-4 h-4 rounded border-line-subtle" />
              Mordida abierta
            </label>
          </div>

          <Field label="Mordida cruzada" className="col-span-3">
            <CheckboxGroup options={CROSSBITE_OPTIONS} selected={form.crossbite} onToggle={(v) => toggleListValue("crossbite", v)} />
          </Field>

          <Field label="Piezas ausentes / extraídas">
            <input className={inputClass} placeholder="Ej. 18, 28, 38, 48" value={form.missingTeeth} onChange={(e) => set("missingTeeth", e.target.value)} />
          </Field>
          <Field label="Piezas retenidas / impactadas">
            <input className={inputClass} placeholder="Ej. 13, 23" value={form.impactedTeeth} onChange={(e) => set("impactedTeeth", e.target.value)} />
          </Field>
          <div />

          <Field label="Notas oclusales" className="col-span-3">
            <textarea className={textareaClass} rows={2} value={form.occlusalNotes} onChange={(e) => set("occlusalNotes", e.target.value)} />
          </Field>
        </div>
      </SectionCard>

      <SectionCard title="Análisis cefalométrico" subtitle="Opcional — si cuenta con radiografía lateral de cráneo">
        <div className="grid grid-cols-4 gap-4">
          <Field label="SNA (°)">
            <input type="number" step="0.1" className={inputClass} value={form.snaAngle} onChange={(e) => set("snaAngle", e.target.value)} />
          </Field>
          <Field label="SNB (°)">
            <input type="number" step="0.1" className={inputClass} value={form.snbAngle} onChange={(e) => set("snbAngle", e.target.value)} />
          </Field>
          <Field label="ANB (°)">
            <input type="number" step="0.1" className={inputClass} value={form.anbAngle} onChange={(e) => set("anbAngle", e.target.value)} />
          </Field>
          <Field label="FMA (°)">
            <input type="number" step="0.1" className={inputClass} value={form.fmaAngle} onChange={(e) => set("fmaAngle", e.target.value)} />
          </Field>
          <SelectField label="Clase esqueletal" value={form.skeletalClass} onChange={(v) => set("skeletalClass", v)} options={SKELETAL_CLASS_OPTIONS} />
          <Field label="Notas cefalométricas" className="col-span-3">
            <textarea className={textareaClass} rows={2} value={form.cephalometricNotes} onChange={(e) => set("cephalometricNotes", e.target.value)} />
          </Field>
        </div>
      </SectionCard>

      <SectionCard title="Diagnóstico ortodóntico">
        <div className="grid grid-cols-1 gap-4">
          <Field label="Diagnóstico esqueletal">
            <textarea className={textareaClass} rows={2} value={form.skeletalDiagnosis} onChange={(e) => set("skeletalDiagnosis", e.target.value)} />
          </Field>
          <Field label="Diagnóstico dental">
            <textarea className={textareaClass} rows={2} value={form.dentalDiagnosis} onChange={(e) => set("dentalDiagnosis", e.target.value)} />
          </Field>
          <Field label="Diagnóstico funcional">
            <textarea className={textareaClass} rows={2} value={form.functionalDiagnosis} onChange={(e) => set("functionalDiagnosis", e.target.value)} />
          </Field>
        </div>
      </SectionCard>

      <SectionCard title="Plan de tratamiento">
        <div className="grid grid-cols-3 gap-4">
          <SelectField label="Fase de tratamiento" value={form.treatmentPhase} onChange={(v) => set("treatmentPhase", v)} options={TREATMENT_PHASE_OPTIONS} />
          <SelectField label="Tipo de aparatología" value={form.applianceType} onChange={(v) => set("applianceType", v)} options={APPLIANCE_TYPE_OPTIONS} />
          <Field label="Duración estimada (meses)">
            <input type="number" className={inputClass} value={form.estimatedDurationMonths} onChange={(e) => set("estimatedDurationMonths", e.target.value)} />
          </Field>
          <Field label="Extracciones planificadas" className="col-span-3">
            <input className={inputClass} placeholder="Ej. 14, 24" value={form.extractionsPlanned} onChange={(e) => set("extractionsPlanned", e.target.value)} />
          </Field>
          <Field label="Objetivos del tratamiento" className="col-span-3">
            <textarea className={textareaClass} rows={2} value={form.treatmentObjectives} onChange={(e) => set("treatmentObjectives", e.target.value)} />
          </Field>
        </div>

        <div className="pt-3 border-t border-line-subtle flex items-center justify-between">
          <p className="text-[12px] text-ink-tertiary">
            Guardada {formatDistanceToNow(savedAt, { addSuffix: true, locale: es })}
          </p>
          <Button onClick={handleSave} disabled={isPending}>
            {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Guardar historia de ortodoncia
          </Button>
        </div>
      </SectionCard>

      <SectionCard title="Controles de ortodoncia" action={
        <Button size="sm" variant="outline" onClick={() => setShowVisitDialog(true)}>
          <Plus className="w-3.5 h-3.5" />
          Nuevo control
        </Button>
      }>
        {visits.length === 0 ? (
          <p className="text-[13px] text-ink-tertiary text-center py-4">Sin controles registrados</p>
        ) : (
          <div className="space-y-3">
            {visits.map((visit, idx) => (
              <div key={visit.id}>
                {idx > 0 && <div className="border-t border-line-subtle mb-3" />}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <p className="text-[13px] font-semibold text-ink-primary">{formatDate(visit.visitDate)}</p>
                    <p className="text-[11px] text-ink-tertiary mt-0.5">
                      {[
                        visit.upperArchwire && `Arco sup.: ${visit.upperArchwire}`,
                        visit.lowerArchwire && `Arco inf.: ${visit.lowerArchwire}`,
                        visit.elastics && `Elásticos: ${visit.elastics}`,
                      ].filter(Boolean).join(" · ") || "Sin detalles de aparatología"}
                    </p>
                    {visit.observations && (
                      <p className="text-[11px] text-ink-tertiary mt-1 bg-inset rounded px-2 py-1">{visit.observations}</p>
                    )}
                    <p className="text-[11px] text-ink-tertiary mt-1">Dr. {visit.doctor.name}</p>
                  </div>
                  <button
                    onClick={() => handleDeleteVisit(visit.id)}
                    className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-inset transition-colors flex-shrink-0"
                    title="Eliminar control"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-ink-tertiary" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {showVisitDialog && (
        <NewVisitDialog leadId={leadId} onClose={() => setShowVisitDialog(false)} onCreated={handleVisitCreated} />
      )}
    </div>
  )
}

function NewVisitDialog({ leadId, onClose, onCreated }: {
  leadId: string
  onClose: () => void
  onCreated: (visit: OrthodonticVisitWithDoctor) => void
}) {
  const [form, setForm] = useState<OrthodonticVisitFields>({
    visitDate: new Date().toISOString().slice(0, 10),
    upperArchwire: "",
    lowerArchwire: "",
    elastics: "",
    proceduresDone: "",
    oralHygiene: "",
    observations: "",
    nextAppointment: "",
  })
  const [isPending, startTransition] = useTransition()

  function set<K extends keyof OrthodonticVisitFields>(key: K, value: OrthodonticVisitFields[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      const result = await createOrthodonticVisit({
        leadId,
        visitDate: form.visitDate ? new Date(form.visitDate).toISOString() : undefined,
        upperArchwire: form.upperArchwire || undefined,
        lowerArchwire: form.lowerArchwire || undefined,
        elastics: form.elastics || undefined,
        proceduresDone: form.proceduresDone || undefined,
        oralHygiene: form.oralHygiene || undefined,
        observations: form.observations || undefined,
        nextAppointment: form.nextAppointment ? new Date(form.nextAppointment).toISOString() : undefined,
      })
      if (result.success) {
        toast.success("Control registrado")
        onCreated(result.data)
      } else {
        toast.error(result.error)
      }
    })
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nuevo control de ortodoncia</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <Field label="Fecha del control">
            <input type="date" className={inputClass} value={form.visitDate} onChange={(e) => set("visitDate", e.target.value)} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Arco superior">
              <input className={inputClass} placeholder="Ej. NiTi .016" value={form.upperArchwire} onChange={(e) => set("upperArchwire", e.target.value)} />
            </Field>
            <Field label="Arco inferior">
              <input className={inputClass} placeholder="Ej. NiTi .016" value={form.lowerArchwire} onChange={(e) => set("lowerArchwire", e.target.value)} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Elásticos">
              <input className={inputClass} placeholder="Ej. Clase II derecha" value={form.elastics} onChange={(e) => set("elastics", e.target.value)} />
            </Field>
            <SelectField label="Higiene oral" value={form.oralHygiene} onChange={(v) => set("oralHygiene", v)} options={ORAL_HYGIENE_OPTIONS} />
          </div>
          <Field label="Procedimientos realizados">
            <textarea className={textareaClass} rows={2} value={form.proceduresDone} onChange={(e) => set("proceduresDone", e.target.value)} />
          </Field>
          <Field label="Observaciones">
            <textarea className={textareaClass} rows={2} value={form.observations} onChange={(e) => set("observations", e.target.value)} />
          </Field>
          <Field label="Próxima cita">
            <input type="date" className={inputClass} value={form.nextAppointment} onChange={(e) => set("nextAppointment", e.target.value)} />
          </Field>

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" disabled={isPending}>
              {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Registrar control
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

const inputClass =
  "w-full h-9 rounded-lg border border-line-subtle bg-transparent px-2.5 text-[13px] text-ink-primary outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"

const textareaClass =
  "w-full rounded-lg border border-line-subtle bg-transparent px-2.5 py-2 text-[13px] text-ink-primary outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 resize-none"

function Field({ label, required, className, children }: {
  label: string
  required?: boolean
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={className}>
      <label className="text-[12px] font-medium text-ink-secondary block mb-1.5">
        {label}{required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  )
}

function SelectField({ label, value, onChange, options, className }: {
  label: string
  value: string
  onChange: (value: string) => void
  options: string[]
  className?: string
}) {
  return (
    <Field label={label} className={className}>
      <select className={inputClass} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">Seleccionar</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    </Field>
  )
}

function CheckboxGroup({ options, selected, onToggle }: {
  options: string[]
  selected: string[]
  onToggle: (value: string) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const isSelected = selected.includes(opt)
        return (
          <button
            type="button"
            key={opt}
            onClick={() => onToggle(opt)}
            className={cn(
              "text-[12px] font-medium px-2.5 py-1 rounded-full border transition-ui flex items-center gap-1",
              isSelected
                ? "bg-brand-50 border-brand-200 text-brand-600"
                : "bg-transparent border-line-subtle text-ink-secondary hover:bg-inset"
            )}
          >
            {opt}
            {isSelected && <X className="w-3 h-3" />}
          </button>
        )
      })}
    </div>
  )
}

function SectionCard({ title, subtitle, action, children }: {
  title: string
  subtitle?: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="bg-surface border border-line-subtle rounded-[12px] p-5 shadow-card space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-[14px] font-bold text-ink-primary">{title}</h3>
          {subtitle && <p className="text-[11px] text-ink-tertiary mt-0.5">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  )
}

