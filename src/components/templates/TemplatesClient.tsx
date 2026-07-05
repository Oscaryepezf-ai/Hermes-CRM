"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, FileText, CheckCircle2, Clock, XCircle, PauseCircle, Edit2, Trash2, Copy, Send, RefreshCw, Megaphone } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { deleteWaTemplate, duplicateWaTemplate, submitWaTemplate, syncWaTemplateStatus } from "@/lib/actions/wa-templates"
import { TemplateEditor } from "./TemplateEditor"
import { CampaignCreator } from "./CampaignCreator"
import type { WaTemplate, WaTemplateStatus } from "@prisma/client"

type Stage = { id: string; name: string }

interface Props {
  initialTemplates: WaTemplate[]
  stages:           Stage[]
}

const STATUS_CONFIG: Record<WaTemplateStatus, { label: string; color: string; icon: React.ElementType }> = {
  BORRADOR:    { label: "Borrador",    color: "bg-gray-100 text-gray-600",   icon: FileText      },
  EN_REVISION: { label: "En revisión", color: "bg-amber-100 text-amber-700", icon: Clock         },
  APROBADA:    { label: "Aprobada",    color: "bg-green-100 text-green-700", icon: CheckCircle2  },
  RECHAZADA:   { label: "Rechazada",   color: "bg-red-100 text-red-700",     icon: XCircle       },
  PAUSADA:     { label: "Pausada",     color: "bg-gray-100 text-gray-500",   icon: PauseCircle   },
}

const CATEGORY_LABEL: Record<string, string> = {
  MARKETING:      "Marketing",
  UTILITY:        "Utilidad",
  AUTHENTICATION: "Autenticación",
}

export function TemplatesClient({ initialTemplates, stages }: Props) {
  const router  = useRouter()
  const [templates, setTemplates] = useState(initialTemplates)
  const [view, setView]           = useState<"list" | "editor" | "campaign">("list")
  const [editing, setEditing]     = useState<WaTemplate | null>(null)
  const [loading, setLoading]     = useState<string | null>(null)
  const [campaign, setCampaign]   = useState<WaTemplate | null>(null)

  function openNew()   { setEditing(null); setView("editor") }
  function openEdit(t: WaTemplate) { setEditing(t); setView("editor") }
  function onSaved()   { setView("list"); router.refresh() }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar esta plantilla?")) return
    setLoading(id)
    const r = await deleteWaTemplate(id)
    setLoading(null)
    if (r.success) { toast.success("Plantilla eliminada"); router.refresh() }
    else toast.error(r.error)
  }

  async function handleDuplicate(id: string) {
    setLoading(`dup-${id}`)
    const r = await duplicateWaTemplate(id)
    setLoading(null)
    if (r.success) { toast.success("Plantilla duplicada"); router.refresh() }
    else toast.error(r.error)
  }

  async function handleSubmit(id: string) {
    setLoading(`sub-${id}`)
    const r = await submitWaTemplate(id)
    setLoading(null)
    if (r.success) { toast.success("Enviada a Meta para revisión"); router.refresh() }
    else toast.error(r.error)
  }

  async function handleSync(id: string) {
    setLoading(`sync-${id}`)
    const r = await syncWaTemplateStatus(id)
    setLoading(null)
    if (r.success) { toast.success(`Estado: ${r.status}`); router.refresh() }
    else toast.error(r.error)
  }

  if (view === "editor") {
    return <TemplateEditor template={editing} onSaved={onSaved} onCancel={() => setView("list")} />
  }

  if (view === "campaign" && campaign) {
    return <CampaignCreator template={campaign} stages={stages} onDone={() => { setCampaign(null); setView("list") }} />
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[15px] font-semibold text-ink-primary">Plantillas de WhatsApp</h2>
          <p className="text-[12px] text-ink-tertiary mt-0.5">
            Crea y gestiona tus mensajes de marketing. Meta debe aprobarlos antes de poder enviarlos.
          </p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white text-[13px] font-medium px-3.5 py-2 rounded-xl transition-ui"
        >
          <Plus className="w-4 h-4" /> Nueva plantilla
        </button>
      </div>

      {/* Reglas rápidas de Meta */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-[12px] text-amber-800 space-y-1">
        <p className="font-semibold">📋 Reglas clave de Meta</p>
        <ul className="list-disc list-inside space-y-0.5 text-amber-700">
          <li>Solo puedes enviar a contactos que dieron consentimiento (opt-in)</li>
          <li>El cuerpo tiene máx. 1024 caracteres · El footer máx. 60</li>
          <li>Variables con formato <code className="bg-amber-100 px-1 rounded">{"{{1}}"}</code>, <code className="bg-amber-100 px-1 rounded">{"{{2}}"}</code> — siempre con ejemplos</li>
          <li>Máx. 3 botones por plantilla · No uses palabras tipo "GRATIS" o "GANA"</li>
          <li>Aprobación en ~24h · Rechazo: debes esperar 30 días para resubmitir</li>
        </ul>
      </div>

      {/* Template list */}
      {templates.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-ink-tertiary gap-3">
          <FileText className="w-10 h-10 opacity-20" />
          <p className="text-sm">Aún no tienes plantillas. Crea la primera.</p>
          <button onClick={openNew} className="text-brand-600 text-sm font-medium hover:underline">
            + Nueva plantilla
          </button>
        </div>
      ) : (
        <div className="grid gap-3">
          {templates.map((tpl) => {
            const cfg     = STATUS_CONFIG[tpl.status]
            const Icon    = cfg.icon
            const isLoading = (s: string) => loading === s

            return (
              <div
                key={tpl.id}
                className="bg-surface border border-line-subtle rounded-[12px] shadow-card p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[13px] font-semibold text-ink-primary font-mono">{tpl.name}</span>
                      <span className={cn("inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full", cfg.color)}>
                        <Icon className="w-3 h-3" />
                        {cfg.label}
                      </span>
                      <span className="text-[11px] text-ink-tertiary border border-line-subtle rounded-full px-2 py-0.5">
                        {CATEGORY_LABEL[tpl.category]}
                      </span>
                      <span className="text-[11px] text-ink-tertiary">{tpl.language.toUpperCase()}</span>
                    </div>

                    {/* Body preview */}
                    <p className="text-[12px] text-ink-secondary mt-1.5 line-clamp-2 whitespace-pre-wrap">
                      {tpl.body}
                    </p>

                    {tpl.rejectionReason && (
                      <p className="text-[11px] text-red-600 mt-1">
                        Motivo de rechazo: {tpl.rejectionReason}
                      </p>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-line-subtle flex-wrap">
                  {/* Editar — solo BORRADOR o RECHAZADA */}
                  {(tpl.status === "BORRADOR" || tpl.status === "RECHAZADA") && (
                    <button
                      onClick={() => openEdit(tpl)}
                      className="flex items-center gap-1.5 text-[11px] font-medium text-ink-secondary hover:text-brand-600 px-2 py-1 rounded-lg hover:bg-brand-50 transition-ui"
                    >
                      <Edit2 className="w-3.5 h-3.5" /> Editar
                    </button>
                  )}

                  {/* Enviar a Meta — solo BORRADOR o RECHAZADA */}
                  {(tpl.status === "BORRADOR" || tpl.status === "RECHAZADA") && (
                    <button
                      onClick={() => handleSubmit(tpl.id)}
                      disabled={isLoading(`sub-${tpl.id}`)}
                      className="flex items-center gap-1.5 text-[11px] font-medium text-white bg-brand-600 hover:bg-brand-700 px-2.5 py-1 rounded-lg transition-ui disabled:opacity-50"
                    >
                      <Send className="w-3.5 h-3.5" />
                      {isLoading(`sub-${tpl.id}`) ? "Enviando…" : "Enviar a Meta"}
                    </button>
                  )}

                  {/* Sync — solo EN_REVISION */}
                  {tpl.status === "EN_REVISION" && (
                    <button
                      onClick={() => handleSync(tpl.id)}
                      disabled={isLoading(`sync-${tpl.id}`)}
                      className="flex items-center gap-1.5 text-[11px] font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 px-2.5 py-1 rounded-lg transition-ui disabled:opacity-50"
                    >
                      <RefreshCw className={cn("w-3.5 h-3.5", isLoading(`sync-${tpl.id}`) && "animate-spin")} />
                      Verificar estado
                    </button>
                  )}

                  {/* Enviar campaña — solo APROBADA */}
                  {tpl.status === "APROBADA" && (
                    <button
                      onClick={() => { setCampaign(tpl); setView("campaign") }}
                      className="flex items-center gap-1.5 text-[11px] font-medium text-white bg-green-600 hover:bg-green-700 px-2.5 py-1 rounded-lg transition-ui"
                    >
                      <Megaphone className="w-3.5 h-3.5" /> Crear campaña
                    </button>
                  )}

                  {/* Duplicar */}
                  <button
                    onClick={() => handleDuplicate(tpl.id)}
                    disabled={isLoading(`dup-${tpl.id}`)}
                    className="flex items-center gap-1.5 text-[11px] font-medium text-ink-secondary hover:text-brand-600 px-2 py-1 rounded-lg hover:bg-brand-50 transition-ui disabled:opacity-50"
                  >
                    <Copy className="w-3.5 h-3.5" /> Duplicar
                  </button>

                  {/* Eliminar — solo BORRADOR o RECHAZADA */}
                  {(tpl.status === "BORRADOR" || tpl.status === "RECHAZADA") && (
                    <button
                      onClick={() => handleDelete(tpl.id)}
                      disabled={isLoading(tpl.id)}
                      className="flex items-center gap-1.5 text-[11px] font-medium text-ink-tertiary hover:text-red-500 px-2 py-1 rounded-lg hover:bg-red-50 transition-ui ml-auto disabled:opacity-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Eliminar
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
