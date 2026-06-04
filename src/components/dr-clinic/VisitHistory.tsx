"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  Plus, ChevronDown, ChevronUp, Pencil, Trash2,
  Wrench, Microscope, Pill, MessageSquare, CalendarCheck, StickyNote,
  Mic2, Calendar, User,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getVisitsByLead, createVisit, updateVisit, deleteVisit } from "@/lib/actions/clinical";
import { VoiceRecorder } from "./VoiceRecorder";
import type { VisitWithDoctor, VisitFields, VisitDictationResult } from "@/types/clinical";

// ─── Field config ─────────────────────────────────────────────────────────────

type FieldCfg = {
  key:         keyof Omit<VisitFields, "visitDate">
  label:       string
  placeholder: string
  Icon:        React.ComponentType<{ className?: string }>
  required?:   boolean
}

const FIELDS: FieldCfg[] = [
  { key: "procedures",   label: "Procedimientos realizados", placeholder: "Describe los procedimientos realizados en esta consulta...", Icon: Wrench,        required: true },
  { key: "findings",     label: "Hallazgos clínicos",        placeholder: "Observaciones del examen, diagnóstico, radiografías...",     Icon: Microscope },
  { key: "medications",  label: "Medicamentos / recetas",    placeholder: "Antibióticos, analgésicos, dosis, duración...",              Icon: Pill },
  { key: "instructions", label: "Indicaciones al paciente",  placeholder: "Cuidados post-operatorios, dieta, higiene oral...",          Icon: MessageSquare },
  { key: "followUp",     label: "Seguimiento / próxima cita",placeholder: "Cuándo volver, qué revisar, controles pendientes...",        Icon: CalendarCheck },
  { key: "notes",        label: "Notas internas",            placeholder: "Notas del equipo (no visibles para el paciente)...",         Icon: StickyNote },
];

const EMPTY: Omit<VisitFields, "visitDate"> = {
  procedures: "", findings: "", medications: "",
  instructions: "", followUp: "", notes: "",
};

// ─── New / Edit form ──────────────────────────────────────────────────────────

function VisitForm({
  leadId,
  visitId,
  initial,
  onSave,
  onCancel,
}: {
  leadId:    string;
  visitId?:  string;
  initial?:  Partial<VisitFields>;
  onSave:    (v: VisitWithDoctor) => void;
  onCancel:  () => void;
}) {
  const [fields,      setFields]      = useState<Omit<VisitFields, "visitDate">>(
    initial ? { ...EMPTY, ...initial } : EMPTY
  );
  const [visitDate,   setVisitDate]   = useState(
    initial?.visitDate
      ? initial.visitDate.slice(0, 10)
      : new Date().toISOString().slice(0, 10)
  );
  const [saving,      setSaving]      = useState(false);
  const [showVoice,   setShowVoice]   = useState(false);
  const [highlighted, setHighlighted] = useState<Set<string>>(new Set());

  const flash = (key: string) => {
    setHighlighted(p => new Set([...p, key]));
    setTimeout(() => setHighlighted(p => { const n = new Set(p); n.delete(key); return n }), 2000);
  };

  const handleDictation = (result: Record<string, string>) => {
    let filled = 0;
    setFields(prev => {
      const next = { ...prev };
      (Object.keys(result) as (keyof typeof EMPTY)[]).forEach(k => {
        if (result[k]?.trim()) { next[k] = result[k]; filled++; flash(k) }
      });
      return next;
    });
    if (filled > 0) toast.success(`${filled} campo${filled > 1 ? "s" : ""} completado${filled > 1 ? "s" : ""} por IA`);
    else toast.info("El dictado no detectó campos para completar");
    setShowVoice(false);
  };

  const handleSave = async () => {
    if (!fields.procedures.trim()) { toast.error("Los procedimientos realizados son obligatorios"); return }
    setSaving(true);
    const payload = { visitDate: new Date(visitDate).toISOString(), ...fields };
    const res = visitId
      ? await updateVisit(visitId, payload)
      : await createVisit({ leadId, ...payload });
    setSaving(false);
    if (res.success) { toast.success(visitId ? "Consulta actualizada" : "Consulta registrada"); onSave(res.data) }
    else toast.error(res.error ?? "Error al guardar");
  };

  return (
    <div className="border border-indigo-200 dark:border-indigo-800 rounded-xl bg-indigo-50/30 dark:bg-indigo-950/10 p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">
          {visitId ? "Editar consulta" : "Registrar nueva consulta"}
        </h3>
        {/* Date */}
        <div className="flex items-center gap-2">
          <Calendar className="w-3.5 h-3.5 text-ink-tertiary" />
          <input
            type="date"
            value={visitDate}
            max={new Date().toISOString().slice(0, 10)}
            onChange={e => setVisitDate(e.target.value)}
            className="text-xs border border-line-soft rounded-lg px-2 py-1.5 bg-surface text-ink-primary focus:outline-none focus:border-brand-300"
          />
        </div>
      </div>

      {/* AI Dictation toggle */}
      <div className="border border-indigo-100 dark:border-indigo-900 rounded-xl bg-white dark:bg-gray-900 p-3">
        <button
          type="button"
          onClick={() => setShowVoice(v => !v)}
          className="flex items-center gap-2 w-full text-left"
        >
          <Mic2 className="w-4 h-4 text-indigo-600" />
          <span className="text-sm font-medium text-indigo-700 dark:text-indigo-300">Dictado por IA</span>
          <span className="text-xs text-ink-tertiary ml-auto">
            {showVoice ? "Ocultar" : "Dictar esta consulta"}
          </span>
          {showVoice
            ? <ChevronUp className="w-3.5 h-3.5 text-ink-tertiary" />
            : <ChevronDown className="w-3.5 h-3.5 text-ink-tertiary" />
          }
        </button>
        {showVoice && (
          <div className="mt-3 pt-3 border-t border-indigo-50 dark:border-indigo-900">
            <p className="text-xs text-indigo-600 dark:text-indigo-400 mb-4 text-center">
              Dicta lo que realizaste en esta consulta y la IA completará los campos
            </p>
            <VoiceRecorder
              leadId={leadId}
              endpoint="/api/clinical/dictate-visit"
              onResult={handleDictation}
              onError={msg => toast.error(msg)}
            />
          </div>
        )}
      </div>

      {/* Fields */}
      <div className="space-y-3">
        {FIELDS.map(({ key, label, placeholder, Icon, required }) => (
          <div key={key}>
            <label className={cn(
              "flex items-center gap-1.5 text-xs font-medium mb-1.5",
              highlighted.has(key) ? "text-indigo-600" : "text-ink-secondary"
            )}>
              <Icon className="w-3.5 h-3.5" />
              {label}
              {required && <span className="text-red-400">*</span>}
            </label>
            <textarea
              rows={key === "procedures" || key === "findings" ? 3 : 2}
              value={fields[key]}
              onChange={e => setFields(p => ({ ...p, [key]: e.target.value }))}
              placeholder={placeholder}
              className={cn(
                "w-full text-sm border rounded-xl px-3 py-2 outline-none resize-y min-h-[60px] transition-all duration-300",
                "placeholder:text-ink-disabled",
                highlighted.has(key)
                  ? "border-indigo-300 ring-2 ring-indigo-100 bg-indigo-50/40 dark:ring-indigo-900 dark:bg-indigo-950/20"
                  : "border-medical-border bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-ink-primary focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
              )}
            />
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 pt-1">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
        >
          Cancelar
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-60 flex items-center gap-2"
        >
          {saving && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
          {visitId ? "Actualizar consulta" : "Guardar consulta"}
        </button>
      </div>
    </div>
  );
}

// ─── Visit card ───────────────────────────────────────────────────────────────

function VisitCard({
  visit,
  onEdit,
  onDelete,
}: {
  visit:    VisitWithDoctor;
  onEdit:   () => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const hasData = (v?: string | null) => v?.trim();

  const visibleFields = FIELDS.filter(f => hasData(visit[f.key]));
  const preview = visibleFields.slice(0, expanded ? visibleFields.length : 2);
  const hasMore = visibleFields.length > 2;

  const handleDelete = async () => {
    if (!confirm("¿Eliminar esta consulta del historial?")) return;
    setDeleting(true);
    const res = await deleteVisit(visit.id);
    if (!res.success) { toast.error(res.error ?? "Error al eliminar"); setDeleting(false) }
    else { toast.success("Consulta eliminada"); onDelete() }
  };

  return (
    <div className="border border-medical-border dark:border-gray-700 rounded-xl bg-medical-card dark:bg-gray-800/50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-medical-border dark:border-gray-700 bg-white/60 dark:bg-gray-800/80">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center flex-shrink-0">
            <User className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <p className="text-[13px] font-semibold text-ink-primary">
              {format(new Date(visit.visitDate), "EEEE d 'de' MMMM 'de' yyyy", { locale: es })}
            </p>
            <p className="text-[11px] text-ink-tertiary">Dr/a. {visit.doctor.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onEdit}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-ink-tertiary hover:bg-inset transition-ui"
            title="Editar"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-ink-tertiary hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-ui disabled:opacity-50"
            title="Eliminar"
          >
            {deleting
              ? <span className="w-3 h-3 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
              : <Trash2 className="w-3.5 h-3.5" />
            }
          </button>
        </div>
      </div>

      {/* Fields */}
      <div className="px-4 py-3 space-y-2.5">
        {visibleFields.length === 0 ? (
          <p className="text-sm text-ink-tertiary italic">Sin datos registrados</p>
        ) : (
          preview.map(({ key, label, Icon }) => (
            <div key={key} className="flex gap-2.5">
              <Icon className="w-3.5 h-3.5 text-ink-tertiary mt-0.5 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] font-semibold text-ink-tertiary uppercase tracking-wide">{label}</p>
                <p className="text-sm text-ink-primary whitespace-pre-wrap leading-snug">{visit[key]}</p>
              </div>
            </div>
          ))
        )}

        {hasMore && (
          <button
            onClick={() => setExpanded(v => !v)}
            className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 font-medium mt-1"
          >
            {expanded
              ? <><ChevronUp className="w-3.5 h-3.5" /> Ver menos</>
              : <><ChevronDown className="w-3.5 h-3.5" /> Ver {visibleFields.length - 2} campos más</>
            }
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function VisitHistory({
  leadId,
  patientName,
}: {
  leadId:      string;
  patientName: string;
}) {
  const [visits,   setVisits]   = useState<VisitWithDoctor[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [creating, setCreating] = useState(false);
  const [editId,   setEditId]   = useState<string | null>(null);

  useEffect(() => {
    getVisitsByLead(leadId).then(res => {
      if (res.success) setVisits(res.data);
      setLoading(false);
    });
  }, [leadId]);

  const handleCreated = (v: VisitWithDoctor) => {
    setVisits(prev => [v, ...prev]);
    setCreating(false);
  };

  const handleUpdated = (v: VisitWithDoctor) => {
    setVisits(prev => prev.map(x => x.id === v.id ? v : x));
    setEditId(null);
  };

  const handleDeleted = (id: string) => {
    setVisits(prev => prev.filter(x => x.id !== id));
  };

  const editVisit = editId ? visits.find(v => v.id === editId) : null;

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="h-24 rounded-xl bg-inset animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-ink-primary">Historial de visitas</h2>
          <p className="text-sm text-gray-500 dark:text-ink-tertiary mt-0.5">
            {patientName} · {visits.length} consulta{visits.length !== 1 ? "s" : ""} registrada{visits.length !== 1 ? "s" : ""}
          </p>
        </div>
        {!creating && !editId && (
          <button
            onClick={() => setCreating(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nueva consulta
          </button>
        )}
      </div>

      {/* New visit form */}
      {creating && (
        <VisitForm
          leadId={leadId}
          onSave={handleCreated}
          onCancel={() => setCreating(false)}
        />
      )}

      {/* Timeline */}
      {visits.length === 0 && !creating ? (
        <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center mb-3">
            <CalendarCheck className="w-6 h-6 text-indigo-300" />
          </div>
          <p className="text-sm font-medium text-gray-500">Sin consultas registradas</p>
          <p className="text-xs text-gray-400 mt-1">Haz clic en "Nueva consulta" para registrar la primera visita</p>
        </div>
      ) : (
        <div className="space-y-3">
          {visits.map(visit => (
            editId === visit.id ? (
              <VisitForm
                key={visit.id}
                leadId={leadId}
                visitId={visit.id}
                initial={{
                  visitDate:    visit.visitDate.toISOString(),
                  procedures:   visit.procedures   ?? "",
                  findings:     visit.findings     ?? "",
                  medications:  visit.medications  ?? "",
                  instructions: visit.instructions ?? "",
                  followUp:     visit.followUp     ?? "",
                  notes:        visit.notes        ?? "",
                }}
                onSave={handleUpdated}
                onCancel={() => setEditId(null)}
              />
            ) : (
              <VisitCard
                key={visit.id}
                visit={visit}
                onEdit={() => { setCreating(false); setEditId(visit.id) }}
                onDelete={() => handleDeleted(visit.id)}
              />
            )
          ))}
        </div>
      )}
    </div>
  );
}
