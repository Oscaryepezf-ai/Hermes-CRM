"use client"

import { useCallback, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  ReactFlow, Background, Controls, useNodesState,
  type Connection, type Edge, type Node as RFNode, type NodeTypes,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import { ArrowLeft, Plus, Loader2, Save } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { saveFlow } from "@/lib/actions/flows"
import { FlowNodeCard, type FlowNodeData, type FlowFlowNode } from "./FlowNodeCard"
import { FlowNodeEditorPanel } from "./FlowNodeEditorPanel"
import type { FlowNodeKind } from "@/lib/flows/types"

const nodeTypes: NodeTypes = { flowNode: FlowNodeCard }

type InitialFlowNode = {
  id: string
  type: FlowNodeKind
  text: string
  mediaUrl: string | null
  mediaType: string | null
  buttons: unknown
  positionX: number
  positionY: number
}

interface FlowBuilderCanvasProps {
  flowId:     string
  flowName:   string
  startNodeId: string | null
  initialNodes: InitialFlowNode[]
}

function toRFNodes(nodes: InitialFlowNode[]): FlowFlowNode[] {
  return nodes.map((n) => ({
    id:        n.id,
    type:      "flowNode",
    position:  { x: n.positionX, y: n.positionY },
    deletable: n.type === "MESSAGE",
    data: {
      kind:      n.type,
      text:      n.text,
      mediaUrl:  n.mediaUrl,
      mediaType: n.mediaType as "image" | "document" | null,
      buttons:   (n.buttons as FlowNodeData["buttons"]) ?? [],
    },
  }))
}

export function FlowBuilderCanvas({ flowId, flowName, startNodeId: initialStartNodeId, initialNodes }: FlowBuilderCanvasProps) {
  const router = useRouter()
  const [nodes, setNodes, onNodesChange] = useNodesState<FlowFlowNode>(toRFNodes(initialNodes))
  const [startNodeId, setStartNodeId] = useState(initialStartNodeId)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) ?? null

  const edges = useMemo<Edge[]>(() => {
    const list: Edge[] = []
    for (const n of nodes) {
      if (n.data.kind !== "MESSAGE") continue
      for (const b of n.data.buttons) {
        if (b.nextNodeId) {
          list.push({ id: `${n.id}-${b.id}`, source: n.id, sourceHandle: b.id, target: b.nextNodeId })
        }
      }
    }
    return list
  }, [nodes])

  const onConnect = useCallback((connection: Connection) => {
    if (!connection.sourceHandle) return
    setNodes((nds) => nds.map((n) => n.id === connection.source ? {
      ...n,
      data: { ...n.data, buttons: n.data.buttons.map((b) => b.id === connection.sourceHandle ? { ...b, nextNodeId: connection.target } : b) },
    } : n))
  }, [setNodes])

  const onEdgesDelete = useCallback((deleted: Edge[]) => {
    setNodes((nds) => nds.map((n) => ({
      ...n,
      data: { ...n.data, buttons: n.data.buttons.map((b) => deleted.some((e) => e.source === n.id && e.sourceHandle === b.id) ? { ...b, nextNodeId: null } : b) },
    })))
  }, [setNodes])

  const onNodesDelete = useCallback((deleted: RFNode[]) => {
    const ids = deleted.map((d) => d.id)
    setNodes((nds) => nds.map((n) => ({
      ...n,
      data: { ...n.data, buttons: n.data.buttons.map((b) => (b.nextNodeId && ids.includes(b.nextNodeId)) ? { ...b, nextNodeId: null } : b) },
    })))
    if (selectedNodeId && ids.includes(selectedNodeId)) setSelectedNodeId(null)
    if (startNodeId && ids.includes(startNodeId)) setStartNodeId(null)
  }, [setNodes, selectedNodeId, startNodeId])

  function updateSelectedNodeData(partial: Partial<FlowNodeData>) {
    if (!selectedNodeId) return
    setNodes((nds) => nds.map((n) => n.id === selectedNodeId ? { ...n, data: { ...n.data, ...partial } } : n))
  }

  function removeSelectedNode() {
    if (!selectedNodeId) return
    const id = selectedNodeId
    setNodes((nds) => nds
      .filter((n) => n.id !== id)
      .map((n) => ({ ...n, data: { ...n.data, buttons: n.data.buttons.map((b) => b.nextNodeId === id ? { ...b, nextNodeId: null } : b) } })))
    if (startNodeId === id) setStartNodeId(null)
    setSelectedNodeId(null)
  }

  function addMessageNode() {
    const id = crypto.randomUUID()
    setNodes((nds) => [...nds, {
      id, type: "flowNode", deletable: true,
      position: { x: 80 + (nds.length * 30) % 360, y: 80 + (nds.length * 90) % 480 },
      data: { kind: "MESSAGE", text: "Nuevo mensaje", mediaUrl: null, mediaType: null, buttons: [] },
    }])
  }

  function handleSave() {
    if (!startNodeId) {
      toast.error("Marca un mensaje como inicial antes de guardar")
      return
    }
    setIsSaving(true)
    const payload = nodes.map((n) => ({
      id: n.id, type: n.data.kind, text: n.data.text, mediaUrl: n.data.mediaUrl, mediaType: n.data.mediaType,
      buttons: n.data.buttons, positionX: n.position.x, positionY: n.position.y,
    }))
    saveFlow(flowId, payload, startNodeId).then((result) => {
      setIsSaving(false)
      if (result.success) {
        toast.success("Flujo guardado")
      } else {
        toast.error(result.error)
      }
    })
  }

  return (
    <div className="flex flex-col h-[78vh] bg-surface border border-line-subtle rounded-[12px] shadow-card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-line-subtle flex-shrink-0">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => router.push("/settings/flows")} className="text-ink-tertiary hover:text-ink-primary">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <p className="text-[13px] font-semibold text-ink-primary">{flowName}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={addMessageNode}>
            <Plus className="w-3.5 h-3.5" /> Agregar mensaje
          </Button>
          <Button type="button" size="sm" onClick={handleSave} disabled={isSaving}>
            {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Guardar flujo
          </Button>
        </div>
      </div>

      <div className="flex-1 flex min-h-0">
        <div className="flex-1">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onNodesDelete={onNodesDelete}
            onEdgesDelete={onEdgesDelete}
            onConnect={onConnect}
            onNodeClick={(_, node) => setSelectedNodeId(node.id)}
            onPaneClick={() => setSelectedNodeId(null)}
            fitView
          >
            <Background />
            <Controls showInteractive={false} />
          </ReactFlow>
        </div>

        {selectedNode && (
          <FlowNodeEditorPanel
            key={selectedNode.id}
            flowId={flowId}
            data={selectedNode.data}
            isStart={selectedNode.id === startNodeId}
            onChange={updateSelectedNodeData}
            onSetStart={() => setStartNodeId(selectedNode.id)}
            onDeleteNode={removeSelectedNode}
            onClose={() => setSelectedNodeId(null)}
          />
        )}
      </div>
    </div>
  )
}
