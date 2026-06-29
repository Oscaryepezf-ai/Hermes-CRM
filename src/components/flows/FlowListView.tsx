"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Plus, Trash2, Workflow, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { createFlow, deleteFlow } from "@/lib/actions/flows"
import { format } from "date-fns"
import { es } from "date-fns/locale"

type FlowSummary = { id: string; name: string; updatedAt: Date; _count: { nodes: number } }

export function FlowListView({ initialFlows }: { initialFlows: FlowSummary[] }) {
  const [flows, setFlows] = useState(initialFlows)
  const [name, setName] = useState("")
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleCreate() {
    if (!name.trim()) {
      toast.error("Ponle un nombre al flujo")
      return
    }
    startTransition(async () => {
      const result = await createFlow(name.trim())
      if (result.success) {
        router.push(`/settings/flows/${result.data.id}`)
      } else {
        toast.error(result.error)
      }
    })
  }

  function handleDelete(id: string) {
    if (!confirm("¿Eliminar este flujo? Esta acción no se puede deshacer.")) return
    startTransition(async () => {
      const result = await deleteFlow(id)
      if (result.success) {
        setFlows((prev) => prev.filter((f) => f.id !== id))
        toast.success("Flujo eliminado")
      } else {
        toast.error(result.error)
      }
    })
  }

  return (
    <div className="space-y-4">
      <div className="bg-surface border border-line-subtle rounded-[12px] p-5 shadow-card space-y-3">
        <h3 className="text-[14px] font-bold text-ink-primary">Crear flujo</h3>
        <div className="flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleCreate() } }}
            placeholder="Ej: Catálogo de servicios"
            className="flex-1 h-9 rounded-lg border border-line-subtle bg-transparent px-2.5 text-[13px] text-ink-primary outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
          />
          <Button type="button" onClick={handleCreate} disabled={isPending}>
            {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            Crear
          </Button>
        </div>
      </div>

      {flows.length === 0 ? (
        <div className="bg-surface border border-line-subtle rounded-[12px] p-8 shadow-card flex flex-col items-center text-center gap-2">
          <Workflow className="w-8 h-8 text-ink-disabled" />
          <p className="text-[13px] text-ink-tertiary">Todavía no tienes flujos. Crea el primero arriba.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {flows.map((flow) => (
            <div
              key={flow.id}
              className="flex items-center justify-between bg-surface border border-line-subtle rounded-[12px] px-4 py-3 shadow-card"
            >
              <a href={`/settings/flows/${flow.id}`} className="flex-1">
                <p className="text-[13px] font-semibold text-ink-primary">{flow.name}</p>
                <p className="text-[11px] text-ink-tertiary mt-0.5">
                  {flow._count.nodes} nodos · actualizado {format(new Date(flow.updatedAt), "d MMM, HH:mm", { locale: es })}
                </p>
              </a>
              <button
                type="button"
                onClick={() => handleDelete(flow.id)}
                disabled={isPending}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-ink-tertiary hover:bg-inset hover:text-red-500 flex-shrink-0"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
