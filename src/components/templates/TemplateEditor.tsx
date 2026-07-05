"use client"

import { useState, useTransition } from "react"
import { ArrowLeft, Plus, Trash2, Info } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { createWaTemplate, updateWaTemplate } from "@/lib/actions/wa-templates"
import { TemplatePreview } from "./TemplatePreview"
import type { WaTemplate, WaTemplateCategory, WaHeaderType } from "@prisma/client"
import type { TemplateButton } from "@/lib/actions/wa-templates"

interface Props {
  template:  WaTemplate | null
  onSaved:   () => void
  onCancel:  () => void
}

const CATEGORIES: { value: WaTemplateCategory; label: string; desc: string }[] = [
  { value: "MARKETING",      label: "Marketing",      desc: "Promociones, ofertas, lanzamientos" },
  { value: "UTILITY",        label: "Utilidad",        desc: "Confirmaciones de cita, recordatorios" },
  { value: "AUTHENTICATION", label: "Autenticación",  desc: "Códigos de verificación (OTP)" },
]

const HEADER_TYPES: { value: WaHeaderType | "NONE"; label: string }[] = [
  { value: "NONE",     label: "Sin encabezado" },
  { value: "TEXT",     label: "Texto"          },
  { value: "IMAGE",    label: "Imagen"         },
  { value: "VIDEO",    label: "Video"          },
  { value: "DOCUMENT", label: "Documento"      },
]

const BUTTON_TYPES = [
  { value: "QUICK_REPLY",   label: "Respuesta rápida" },
  { value: "URL",           label: "Enlace web"       },
  { value: "PHONE_NUMBER",  label: "Llamar"           },
]

export function TemplateEditor({ template, onSaved, onCancel }: Props) {
  const [isPending, startTransition] = useTransition()

  const [name,          setName]          = useState(template?.name ?? "")
  const [category,      setCategory]      = useState<WaTemplateCategory>(template?.category ?? "MARKETING")
  const [language,      setLanguage]      = useState(template?.language ?? "es")
  const [headerType,    setHeaderType]    = useState<WaHeaderType | "NONE">(template?.headerType ?? "NONE")
  const [headerText,    setHeaderText]    = useState(template?.headerText ?? "")
  const [headerExample, setHeaderExample] = useState(template?.headerExample ?? "")
  const [body,          setBody]          = useState(template?.body ?? "")
  const [bodyExamples,  setBodyExamples]  = useState<string[]>(
    Array.isArray(template?.bodyExamples) ? (template.bodyExamples as string[]) : []
  )
  const [footer,        setFooter]        = useState(template?.footer ?? "")
  const [buttons,       setButtons]       = useState<TemplateButton[]>(
    Array.isArray(template?.buttons) ? (template.buttons as TemplateButton[]) : []
  )

  // Count variables in body
  const varCount = (body.match(/\{\{\d+\}\}/g) ?? []).length

  function insertVar() {
    const next = varCount + 1
    setBody(b => b + `{{${next}}}`)
    if (bodyExamples.length < next) {
      setBodyExamples(ex => [...ex, `ejemplo${next}`])
    }
  }

  function addButton() {
    if (buttons.length >= 3) return
    setButtons(b => [...b, { type: "QUICK_REPLY", text: "" }])
  }

  function updateButton(i: number, patch: Partial<TemplateButton>) {
    setButtons(b => b.map((btn, idx) => idx === i ? { ...btn, ...patch } : btn))
  }

  function removeButton(i: number) {
    setButtons(b => b.filter((_, idx) => idx !== i))
  }

  function handleSubmit() {
    if (!name.trim()) { toast.error("El nombre es obligatorio"); return }
    if (!body.trim()) { toast.error("El cuerpo es obligatorio"); return }
    if (body.length > 1024) { toast.error("El cuerpo supera 1024 caracteres"); return }
    if (footer.length > 60) { toast.error("El footer supera 60 caracteres"); return }

    startTransition(async () => {
      const data = {
        name,
        category,
        language,
        headerType: headerType === "NONE" ? null : headerType,
        headerText: headerType === "TEXT" ? headerText : undefined,
        headerExample: headerType === "TEXT" ? headerExample : undefined,
        body,
        bodyExamples,
        footer: footer || undefined,
        buttons,
      }

      const result = template
        ? await updateWaTemplate(template.id, data)
        : await createWaTemplate(data)

      if (result.success) {
        toast.success(template ? "Plantilla actualizada" : "Plantilla creada")
        onSaved()
      } else {
        toast.error(result.error)
      }
    })
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onCancel}
          className="p-1.5 rounded-lg hover:bg-inset text-ink-tertiary hover:text-ink-primary transition-ui"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h2 className="text-[15px] font-semibold text-ink-primary">
            {template ? "Editar plantilla" : "Nueva plantilla"}
          </h2>
          <p className="text-[12px] text-ink-tertiary">Los cambios se guardan como borrador</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* ── Left: Form ── */}
        <div className="space-y-5">

          {/* Nombre */}
          <div>
            <label className="block text-[12px] font-semibold text-ink-secondary mb-1.5">
              Nombre de la plantilla <span className="text-red-500">*</span>
            </label>
            <input
              value={name}
              onChange={e => setName(e.target.value.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, ""))}
              disabled={!!template}
              placeholder="ej: recordatorio_cita"
              className="w-full text-[13px] font-mono px-3 py-2 bg-canvas border border-line-subtle rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-300 disabled:opacity-50"
            />
            <p className="text-[11px] text-ink-disabled mt-1">Solo minúsculas, números y guión bajo. No se puede cambiar después de crear.</p>
          </div>

          {/* Categoría */}
          <div>
            <label className="block text-[12px] font-semibold text-ink-secondary mb-1.5">Categoría <span className="text-red-500">*</span></label>
            <div className="grid gap-2">
              {CATEGORIES.map(c => (
                <label
                  key={c.value}
                  className={cn(
                    "flex items-start gap-2.5 border rounded-xl px-3 py-2.5 cursor-pointer transition-ui",
                    category === c.value
                      ? "border-brand-400 bg-brand-50"
                      : "border-line-subtle hover:border-line-soft"
                  )}
                >
                  <input
                    type="radio"
                    name="category"
                    value={c.value}
                    checked={category === c.value}
                    onChange={() => setCategory(c.value)}
                    className="mt-0.5 accent-brand-600"
                  />
                  <div>
                    <p className="text-[13px] font-medium text-ink-primary">{c.label}</p>
                    <p className="text-[11px] text-ink-tertiary">{c.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Idioma */}
          <div>
            <label className="block text-[12px] font-semibold text-ink-secondary mb-1.5">Idioma</label>
            <select
              value={language}
              onChange={e => setLanguage(e.target.value)}
              className="w-full text-[13px] px-3 py-2 bg-canvas border border-line-subtle rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-300"
            >
              <option value="es">Español</option>
              <option value="es_MX">Español (México)</option>
              <option value="es_AR">Español (Argentina)</option>
              <option value="en_US">Inglés</option>
              <option value="pt_BR">Portugués (Brasil)</option>
            </select>
          </div>

          {/* Header */}
          <div>
            <label className="block text-[12px] font-semibold text-ink-secondary mb-1.5">Encabezado (opcional)</label>
            <div className="flex gap-2 flex-wrap mb-3">
              {HEADER_TYPES.map(h => (
                <button
                  key={h.value}
                  type="button"
                  onClick={() => setHeaderType(h.value)}
                  className={cn(
                    "text-[12px] font-medium px-3 py-1.5 rounded-lg border transition-ui",
                    headerType === h.value
                      ? "bg-brand-600 text-white border-brand-600"
                      : "bg-canvas text-ink-secondary border-line-subtle hover:border-line-soft"
                  )}
                >
                  {h.label}
                </button>
              ))}
            </div>

            {headerType === "TEXT" && (
              <div className="space-y-2">
                <input
                  value={headerText}
                  onChange={e => setHeaderText(e.target.value)}
                  maxLength={60}
                  placeholder="Texto del encabezado (máx. 60 caracteres)"
                  className="w-full text-[13px] px-3 py-2 bg-canvas border border-line-subtle rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-300"
                />
                <input
                  value={headerExample}
                  onChange={e => setHeaderExample(e.target.value)}
                  placeholder="Ejemplo de valor si usas {{1}}"
                  className="w-full text-[13px] px-3 py-2 bg-canvas border border-line-subtle rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-300"
                />
              </div>
            )}
            {(headerType === "IMAGE" || headerType === "VIDEO" || headerType === "DOCUMENT") && (
              <div className="flex items-center gap-2 text-[12px] text-ink-tertiary bg-inset rounded-xl px-3 py-2.5">
                <Info className="w-3.5 h-3.5 flex-shrink-0" />
                Al enviar la campaña deberás proveer la URL pública del archivo.
              </div>
            )}
          </div>

          {/* Body */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[12px] font-semibold text-ink-secondary">
                Cuerpo del mensaje <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-2">
                <span className={cn("text-[11px]", body.length > 1024 ? "text-red-500" : "text-ink-disabled")}>
                  {body.length}/1024
                </span>
                <button
                  type="button"
                  onClick={insertVar}
                  className="text-[11px] font-medium text-brand-600 hover:text-brand-700 border border-brand-200 rounded-lg px-2 py-0.5 hover:bg-brand-50 transition-ui"
                >
                  + Variable {"{{" + (varCount + 1) + "}}"}
                </button>
              </div>
            </div>
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              rows={5}
              placeholder={"Hola {{1}}, te recordamos tu cita el {{2}}. ¡Te esperamos!"}
              className="w-full text-[13px] px-3 py-2.5 bg-canvas border border-line-subtle rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-300 resize-none"
            />

            {/* Variable examples */}
            {varCount > 0 && (
              <div className="mt-2 space-y-1.5">
                <p className="text-[11px] font-semibold text-ink-secondary">Ejemplos de variables (requerido por Meta):</p>
                {Array.from({ length: varCount }, (_, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-[11px] font-mono text-brand-600 w-8">{"{{" + (i + 1) + "}}"}</span>
                    <input
                      value={bodyExamples[i] ?? ""}
                      onChange={e => setBodyExamples(ex => {
                        const n = [...ex]
                        n[i] = e.target.value
                        return n
                      })}
                      placeholder={`Ejemplo para variable ${i + 1}`}
                      className="flex-1 text-[12px] px-2.5 py-1.5 bg-canvas border border-line-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-300"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[12px] font-semibold text-ink-secondary">Pie de mensaje (opcional)</label>
              <span className={cn("text-[11px]", footer.length > 60 ? "text-red-500" : "text-ink-disabled")}>
                {footer.length}/60
              </span>
            </div>
            <input
              value={footer}
              onChange={e => setFooter(e.target.value)}
              maxLength={60}
              placeholder="ej: No responder · Clínica Dental Sonrisas"
              className="w-full text-[13px] px-3 py-2 bg-canvas border border-line-subtle rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-300"
            />
          </div>

          {/* Buttons */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[12px] font-semibold text-ink-secondary">Botones (máx. 3, opcional)</label>
              {buttons.length < 3 && (
                <button
                  type="button"
                  onClick={addButton}
                  className="text-[11px] font-medium text-brand-600 hover:text-brand-700 flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Agregar botón
                </button>
              )}
            </div>
            <div className="space-y-2">
              {buttons.map((btn, i) => (
                <div key={i} className="flex items-start gap-2 bg-inset rounded-xl p-3">
                  <div className="flex-1 space-y-2">
                    <select
                      value={btn.type}
                      onChange={e => updateButton(i, { type: e.target.value as any, value: "" })}
                      className="w-full text-[12px] px-2.5 py-1.5 bg-canvas border border-line-subtle rounded-lg focus:outline-none"
                    >
                      {BUTTON_TYPES.map(t => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                    <input
                      value={btn.text}
                      onChange={e => updateButton(i, { text: e.target.value })}
                      maxLength={25}
                      placeholder="Texto del botón (máx. 25 chars)"
                      className="w-full text-[12px] px-2.5 py-1.5 bg-canvas border border-line-subtle rounded-lg focus:outline-none"
                    />
                    {(btn.type === "URL" || btn.type === "PHONE_NUMBER") && (
                      <input
                        value={btn.value ?? ""}
                        onChange={e => updateButton(i, { value: e.target.value })}
                        placeholder={btn.type === "URL" ? "https://..." : "+593..."}
                        className="w-full text-[12px] px-2.5 py-1.5 bg-canvas border border-line-subtle rounded-lg focus:outline-none"
                      />
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeButton(i)}
                    className="p-1.5 text-ink-tertiary hover:text-red-500 hover:bg-red-50 rounded-lg transition-ui mt-0.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Save */}
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 py-2.5 text-[13px] font-medium text-ink-secondary border border-line-subtle rounded-xl hover:bg-inset transition-ui"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={isPending}
              className="flex-1 py-2.5 text-[13px] font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-xl transition-ui disabled:opacity-50"
            >
              {isPending ? "Guardando…" : "Guardar borrador"}
            </button>
          </div>
        </div>

        {/* ── Right: Preview ── */}
        <div className="sticky top-4">
          <p className="text-[12px] font-semibold text-ink-secondary mb-3">Vista previa</p>
          <TemplatePreview
            headerType={headerType === "NONE" ? null : headerType}
            headerText={headerText}
            body={body}
            bodyExamples={bodyExamples}
            footer={footer}
            buttons={buttons}
          />
        </div>
      </div>
    </div>
  )
}
