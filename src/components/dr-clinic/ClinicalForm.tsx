"use client";

import { useState, useEffect, useRef } from "react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { Mic2, ClipboardList, Stethoscope, Clock } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { saveClinicalHistory } from "@/lib/actions/clinical";
import { VoiceRecorder } from "./VoiceRecorder";
import { Odontogram } from "./Odontogram";
import { VisitHistory } from "./VisitHistory";
import type { ClinicalFields, DictationResult, ClinicalHistoryWithLead, OdontogramData } from "@/types/clinical";

const EMPTY_FIELDS: ClinicalFields = {
  reasonForConsult:  "",
  medicalHistory:    "",
  dentalHistory:     "",
  odontogramNotes:   "",
  proposedTreatment: "",
  observations:      "",
};

const FIELD_CONFIG: { key: keyof ClinicalFields; label: string; placeholder: string }[] = [
  { key: "reasonForConsult",  label: "Motivo de la consulta",         placeholder: "¿Por qué consulta el paciente hoy?" },
  { key: "medicalHistory",    label: "Antecedentes médicos",          placeholder: "Alergias, enfermedades sistémicas, medicamentos actuales..." },
  { key: "dentalHistory",     label: "Antecedentes odontológicos",    placeholder: "Tratamientos previos, prótesis, cirugías..." },
  { key: "odontogramNotes",   label: "Notas del odontograma",        placeholder: "Estado de piezas dentales observadas en consulta..." },
  { key: "proposedTreatment", label: "Plan de tratamiento propuesto", placeholder: "Procedimientos a realizar, secuencia sugerida..." },
  { key: "observations",      label: "Observaciones adicionales",     placeholder: "Notas del doctor para próximas sesiones..." },
];

type Tab = "anamnesis" | "odontograma" | "historial";

interface ClinicalFormProps {
  history: ClinicalHistoryWithLead;
}

export function ClinicalForm({ history }: ClinicalFormProps) {
  const [tab, setTab]             = useState<Tab>("anamnesis");
  const [fields, setFields]       = useState<ClinicalFields>(() => ({
    reasonForConsult:  history.reasonForConsult  ?? "",
    medicalHistory:    history.medicalHistory    ?? "",
    dentalHistory:     history.dentalHistory     ?? "",
    odontogramNotes:   history.odontogramNotes   ?? "",
    proposedTreatment: history.proposedTreatment ?? "",
    observations:      history.observations      ?? "",
  }));
  const [highlighted, setHighlighted] = useState<Set<keyof ClinicalFields>>(new Set());
  const [isSaving, setIsSaving]       = useState(false);
  const highlightTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const isNew = !history.reasonForConsult && !history.medicalHistory &&
                !history.dentalHistory && !history.proposedTreatment;

  const odontogramData: OdontogramData =
    (history.odontogramData as OdontogramData | null) ?? {};

  const flashField = (key: keyof ClinicalFields) => {
    setHighlighted((prev) => new Set([...prev, key]));
    const existing = highlightTimers.current.get(key);
    if (existing) clearTimeout(existing);
    const t = setTimeout(() => {
      setHighlighted((prev) => { const n = new Set(prev); n.delete(key); return n });
    }, 2000);
    highlightTimers.current.set(key, t);
  };

  useEffect(() => {
    const timers = highlightTimers.current;
    return () => { timers.forEach(clearTimeout) };
  }, []);

  const handleDictationResult = (result: Record<string, string>) => {
    let filled = 0;
    setFields((prev) => {
      const next = { ...prev };
      (Object.keys(result) as (keyof ClinicalFields)[]).forEach((key) => {
        const val = result[key];
        if (val?.trim()) { next[key] = val; filled++; flashField(key) }
      });
      return next;
    });
    if (filled > 0) toast.success(`${filled} campo${filled > 1 ? "s" : ""} completado${filled > 1 ? "s" : ""} por IA`);
    else toast.info("El dictado no detectó campos para completar");
  };

  const handleSave = async () => {
    setIsSaving(true);
    const res = await saveClinicalHistory({ leadId: history.leadId, ...fields });
    setIsSaving(false);
    if (res.success) toast.success("Historia clínica guardada");
    else toast.error(res.error ?? "Error al guardar");
  };

  return (
    <div className="flex flex-col gap-0">
      {/* Tab bar */}
      <div className="flex border-b border-line-subtle bg-surface rounded-t-2xl overflow-hidden">
        <TabBtn active={tab === "anamnesis"} onClick={() => setTab("anamnesis")}>
          <ClipboardList className="w-3.5 h-3.5" />
          Anamnesis
        </TabBtn>
        <TabBtn active={tab === "odontograma"} onClick={() => setTab("odontograma")}>
          <Stethoscope className="w-3.5 h-3.5" />
          Odontograma
        </TabBtn>
        <TabBtn active={tab === "historial"} onClick={() => setTab("historial")}>
          <Clock className="w-3.5 h-3.5" />
          Historial de visitas
        </TabBtn>
      </div>

      {/* Content */}
      <div className="bg-medical-card rounded-b-2xl border border-t-0 border-medical-border shadow-sm p-6">

        {/* ─── ANAMNESIS TAB ─────────────────────────────────── */}
        {tab === "anamnesis" && (
          <>
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-ink-primary">Historia Clínica</h2>
                <p className="text-sm text-gray-500 dark:text-ink-tertiary mt-0.5">{history.lead.fullName}</p>
              </div>
              <span className={cn(
                "text-xs font-medium px-2.5 py-1 rounded-full",
                isNew ? "bg-slate-100 text-slate-500" : "bg-emerald-100 text-emerald-700"
              )}>
                {isNew ? "Nueva ficha" : `Guardada ${formatDistanceToNow(new Date(history.updatedAt), { addSuffix: true, locale: es })}`}
              </span>
            </div>

            {/* Voice dictation */}
            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 mb-6">
              <div className="flex items-center gap-2 mb-1">
                <Mic2 className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-semibold text-indigo-800">Dictado por voz</h3>
              </div>
              <p className="text-xs text-indigo-600 mb-4">
                Graba tu dictado y la IA completará el formulario automáticamente
              </p>
              <VoiceRecorder
                leadId={history.leadId}
                onResult={handleDictationResult}
                onError={(msg) => toast.error(msg)}
              />
            </div>

            {/* Fields */}
            <div className="space-y-4">
              {FIELD_CONFIG.map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label htmlFor={key} className="block text-sm font-medium text-gray-700 dark:text-ink-secondary mb-1.5">
                    {label}
                  </label>
                  <textarea
                    id={key}
                    rows={4}
                    value={fields[key]}
                    onChange={(e) => setFields((prev) => ({ ...prev, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className={cn(
                      "w-full font-mono text-sm border rounded-xl px-3 py-2.5 outline-none resize-y min-h-[100px] max-h-[200px] transition-all duration-300 placeholder:text-gray-300",
                      highlighted.has(key)
                        ? "border-indigo-300 ring-2 ring-indigo-200 bg-indigo-50/30"
                        : "border-medical-border bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-ink-primary focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                    )}
                  />
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-medical-border">
              <p className="text-xs text-gray-400">
                {isNew ? "Sin guardar — nueva historia clínica"
                  : `Última actualización: ${formatDistanceToNow(new Date(history.updatedAt), { addSuffix: true, locale: es })}`}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setFields({
                    reasonForConsult:  history.reasonForConsult  ?? "",
                    medicalHistory:    history.medicalHistory    ?? "",
                    dentalHistory:     history.dentalHistory     ?? "",
                    odontogramNotes:   history.odontogramNotes   ?? "",
                    proposedTreatment: history.proposedTreatment ?? "",
                    observations:      history.observations      ?? "",
                  })}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-60 flex items-center gap-2"
                >
                  {isSaving && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  Guardar historia clínica
                </button>
              </div>
            </div>
          </>
        )}

        {/* ─── ODONTOGRAMA TAB ──────────────────────────────── */}
        {tab === "odontograma" && (
          <>
            <div className="flex items-start justify-between mb-5">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-ink-primary">Odontograma</h2>
                <p className="text-sm text-gray-500 dark:text-ink-tertiary mt-0.5">{history.lead.fullName}</p>
              </div>
            </div>
            <Odontogram
              leadId={history.leadId}
              initialData={odontogramData}
            />
          </>
        )}

        {tab === "historial" && (
          <VisitHistory
            leadId={history.leadId}
            patientName={history.lead.fullName}
          />
        )}
      </div>
    </div>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-ui",
        active
          ? "border-indigo-500 text-indigo-600 bg-white dark:bg-gray-800"
          : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900"
      )}
    >
      {children}
    </button>
  );
}
