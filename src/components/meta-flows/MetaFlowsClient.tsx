"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Plus, Layers, CheckCircle2, Clock, XCircle, PauseCircle, RefreshCw, Trash2, Send, BarChart2, ChevronDown, ChevronUp, Key } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { createAndDeployFlow, publishFlow, syncFlowStatus, deleteMetaFlow } from "@/lib/actions/meta-flows"
import { DENTAL_FLOW_TEMPLATES } from "@/lib/whatsapp/meta-flows-templates"
import type { MetaFlowStatus, MetaFlowCategory } from "@prisma/client"

type FlowWithCount = {
  id:          string
  name:        string
  description: string | null
  category:    MetaFlowCategory
  status:      MetaFlowStatus
  metaFlowId:  string | null
  metaStatus:  string | null
  publishedAt: Date | null
  createdAt:   Date
  _count:      { submissions: number }
}

interface Props {
  initialFlows:  FlowWithCount[]
  hasPrivateKey: boolean
}

const STATUS_CFG: Record<MetaFlowStatus, { label: string; color: string; icon: React.ElementType }> = {
  DRAFT:       { label: "Borrador",    color: "bg-gray-100 text-gray-600",   icon: Clock        },
  PUBLISHED:   { label: "Publicado",   color: "bg-green-100 text-green-700", icon: CheckCircle2 },
  DEPRECATED:  { label: "Deprecado",   color: "bg-amber-100 text-amber-700", icon: PauseCircle  },
  BLOCKED:     { label: "Bloqueado",   color: "bg-red-100 text-red-700",     icon: XCircle      },
}

const CATEGORY_CFG: Record<MetaFlowCategory, { label: string; emoji: string }> = {
  LEAD_QUALIFICATION:  { label: "Calificación de lead", emoji: "🎯" },
  APPOINTMENT_REQUEST: { label: "Solicitud de cita",    emoji: "📅" },
  POST_VISIT_SURVEY:   { label: "Encuesta post-visita", emoji: "⭐" },
  CUSTOM:              { label: "Personalizado",         emoji: "✏️" },
}

export function MetaFlowsClient({ initialFlows, hasPrivateKey }: Props) {
  const router  = useRouter()
  const [isPending, startTransition] = useTransition()
  const [loading, setLoading]   = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  async function handleCreate(tpl: typeof DENTAL_FLOW_TEMPLATES[0]) {
    setLoading(`create-${tpl.id}`)
    const r = await createAndDeployFlow({
      name:        tpl.name,
      description: tpl.description,
      category:    tpl.category as MetaFlowCategory,
      screens:     tpl.screens,
    })
    setLoading(null)
    if (r.success) {
      toast.success("Flow creado en Meta. Publícalo cuando estés listo.")
      router.refresh()
      setCreating(false)
    } else {
      toast.error(r.error ?? "Error al crear el flow")
    }
  }

  async function handlePublish(id: string) {
    setLoading(`pub-${id}`)
    const r = await publishFlow(id)
    setLoading(null)
    if (r.success) { toast.success("Flow publicado — ya puedes enviarlo a pacientes"); router.refresh() }
    else toast.error(r.error)
  }

  async function handleSync(id: string) {
    setLoading(`sync-${id}`)
    const r = await syncFlowStatus(id)
    setLoading(null)
    if (r.success) {
      if (r.validationErrors?.length) toast.warning(`Estado: ${r.status} — hay errores de validación`)
      else toast.success(`Estado: ${r.status}`)
      router.refresh()
    } else toast.error(r.error)
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar este flow?")) return
    setLoading(`del-${id}`)
    const r = await deleteMetaFlow(id)
    setLoading(null)
    if (r.success) { toast.success("Flow eliminado"); router.refresh() }
    else toast.error(r.error)
  }

  const isL = (s: string) => loading === s

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[15px] font-semibold text-ink-primary">WhatsApp Flows</h2>
          <p className="text-[12px] text-ink-tertiary mt-0.5">
            Formularios y pantallas nativas dentro del chat de WhatsApp. Sin salir de la app.
          </p>
        </div>
        <button
          onClick={() => setCreating(v => !v)}
          className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white text-[13px] font-medium px-3.5 py-2 rounded-xl transition-ui"
        >
          <Plus className="w-4 h-4" />
          Nuevo flow
          {creating ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Aviso clave privada */}
      {!hasPrivateKey && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <Key className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-[12px] text-amber-800 space-y-1">
            <p className="font-semibold">Configura la clave privada RSA para activar el endpoint cifrado</p>
            <p>Meta requiere un endpoint cifrado para los flows. Agrega <code className="bg-amber-100 px-1 rounded">WA_FLOWS_PRIVATE_KEY</code> en tus variables de entorno de Vercel con tu clave privada RSA en formato PEM.</p>
            <p className="text-amber-600">Generar clave: <code className="bg-amber-100 px-1 rounded">openssl genrsa -out private.pem 2048</code></p>
          </div>
        </div>
      )}

      {/* Qué son los Flows */}
      <div className="grid grid-cols-3 gap-3 text-[12px]">
        {[
          { icon: "📋", title: "Formularios nativos", desc: "Campos de texto, selección, fecha — todo dentro de WhatsApp" },
          { icon: "📡", title: "Sin salir del chat",  desc: "El paciente completa el formulario sin abrir ningún link" },
          { icon: "⚡", title: "Datos al CRM",         desc: "Las respuestas llegan automáticamente al perfil del lead" },
        ].map(item => (
          <div key={item.title} className="bg-surface border border-line-subtle rounded-xl p-3">
            <p className="text-lg mb-1">{item.icon}</p>
            <p className="font-semibold text-ink-primary">{item.title}</p>
            <p className="text-ink-tertiary mt-0.5">{item.desc}</p>
          </div>
        ))}
      </div>

      {/* Template selector */}
      {creating && (
        <div className="bg-inset border border-line-subtle rounded-2xl p-4 space-y-3">
          <p className="text-[13px] font-semibold text-ink-primary">Plantillas prediseñadas para tu clínica</p>
          <div className="grid gap-3">
            {DENTAL_FLOW_TEMPLATES.map(tpl => (
              <div
                key={tpl.id}
                className="bg-surface border border-line-subtle rounded-xl p-4 flex items-start justify-between gap-4"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-base">{CATEGORY_CFG[tpl.category as MetaFlowCategory].emoji}</span>
                    <span className="text-[13px] font-semibold text-ink-primary">{tpl.name}</span>
                    <span className="text-[11px] text-ink-tertiary border border-line-subtle rounded-full px-2 py-0.5">
                      {CATEGORY_CFG[tpl.category as MetaFlowCategory].label}
                    </span>
                  </div>
                  <p className="text-[12px] text-ink-secondary">{tpl.description}</p>
                </div>
                <button
                  onClick={() => handleCreate(tpl)}
                  disabled={isL(`create-${tpl.id}`)}
                  className="flex items-center gap-1.5 text-[12px] font-semibold text-white bg-brand-600 hover:bg-brand-700 px-3 py-1.5 rounded-lg transition-ui disabled:opacity-50 flex-shrink-0"
                >
                  {isL(`create-${tpl.id}`) ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  Crear
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Flow list */}
      {initialFlows.length === 0 && !creating ? (
        <div className="flex flex-col items-center justify-center py-16 text-ink-tertiary gap-3">
          <Layers className="w-10 h-10 opacity-20" />
          <p className="text-sm">Aún no tienes flows. Crea el primero desde las plantillas.</p>
          <button onClick={() => setCreating(true)} className="text-brand-600 text-sm font-medium hover:underline">
            + Nuevo flow
          </button>
        </div>
      ) : (
        <div className="grid gap-3">
          {initialFlows.map(flow => {
            const cfg  = STATUS_CFG[flow.status]
            const Icon = cfg.icon
            const cat  = CATEGORY_CFG[flow.category]

            return (
              <div key={flow.id} className="bg-surface border border-line-subtle rounded-[12px] shadow-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-base">{cat.emoji}</span>
                      <span className="text-[13px] font-semibold text-ink-primary">{flow.name}</span>
                      <span className={cn("inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full", cfg.color)}>
                        <Icon className="w-3 h-3" />
                        {cfg.label}
                      </span>
                      <span className="text-[11px] text-ink-tertiary border border-line-subtle rounded-full px-2 py-0.5">
                        {cat.label}
                      </span>
                    </div>
                    {flow.description && (
                      <p className="text-[12px] text-ink-secondary">{flow.description}</p>
                    )}
                    {flow.metaFlowId && (
                      <p className="text-[11px] text-ink-disabled mt-1 font-mono">ID Meta: {flow.metaFlowId}</p>
                    )}
                  </div>

                  {/* Submission count */}
                  <div className="flex items-center gap-1 text-[12px] text-ink-tertiary flex-shrink-0">
                    <BarChart2 className="w-3.5 h-3.5" />
                    <span>{flow._count.submissions} respuestas</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-line-subtle flex-wrap">
                  {/* Publicar — solo DRAFT */}
                  {flow.status === "DRAFT" && flow.metaFlowId && (
                    <button
                      onClick={() => handlePublish(flow.id)}
                      disabled={isL(`pub-${flow.id}`)}
                      className="flex items-center gap-1.5 text-[11px] font-medium text-white bg-green-600 hover:bg-green-700 px-2.5 py-1 rounded-lg transition-ui disabled:opacity-50"
                    >
                      {isL(`pub-${flow.id}`)
                        ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        : <CheckCircle2 className="w-3.5 h-3.5" />
                      }
                      Publicar en Meta
                    </button>
                  )}

                  {/* Sincronizar */}
                  {flow.metaFlowId && (
                    <button
                      onClick={() => handleSync(flow.id)}
                      disabled={isL(`sync-${flow.id}`)}
                      className="flex items-center gap-1.5 text-[11px] font-medium text-ink-secondary hover:text-brand-600 px-2 py-1 rounded-lg hover:bg-brand-50 transition-ui disabled:opacity-50"
                    >
                      <RefreshCw className={cn("w-3.5 h-3.5", isL(`sync-${flow.id}`) && "animate-spin")} />
                      Sincronizar estado
                    </button>
                  )}

                  {/* Eliminar — solo si no publicado */}
                  {flow.status !== "PUBLISHED" && (
                    <button
                      onClick={() => handleDelete(flow.id)}
                      disabled={isL(`del-${flow.id}`)}
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
