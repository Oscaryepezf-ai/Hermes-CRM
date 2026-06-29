"use client"

import { Handle, Position, type NodeProps, type Node } from "@xyflow/react"
import { MessageSquare, UserRound, Flag, Image as ImageIcon, FileText, Video } from "lucide-react"
import { cn } from "@/lib/utils"
import type { FlowButton, FlowNodeKind } from "@/lib/flows/types"

export type FlowNodeData = {
  kind:      FlowNodeKind
  text:      string
  mediaUrl:  string | null
  mediaType: "image" | "video" | "document" | null
  buttons:   FlowButton[]
}

export type FlowFlowNode = Node<FlowNodeData, "flowNode">

const KIND_META: Record<FlowNodeKind, { icon: typeof MessageSquare; label: string; accent: string }> = {
  MESSAGE: { icon: MessageSquare, label: "Mensaje",            accent: "text-brand-600 bg-brand-50" },
  HANDOFF: { icon: UserRound,     label: "Transferir a humano", accent: "text-amber-600 bg-amber-50" },
  END:     { icon: Flag,          label: "Fin del flujo",        accent: "text-emerald-600 bg-emerald-50" },
}

export function FlowNodeCard({ data, selected }: NodeProps<FlowFlowNode>) {
  const meta = KIND_META[data.kind]
  const Icon = meta.icon

  return (
    <div
      className={cn(
        "w-[230px] rounded-xl border bg-surface shadow-card overflow-hidden",
        selected ? "border-brand-400 ring-2 ring-brand-200" : "border-line-subtle"
      )}
    >
      {data.kind !== "MESSAGE" && (
        <Handle type="target" position={Position.Left} className="!w-2.5 !h-2.5 !bg-ink-tertiary" />
      )}
      {data.kind === "MESSAGE" && (
        <Handle type="target" position={Position.Left} className="!w-2.5 !h-2.5 !bg-ink-tertiary" style={{ top: 20 }} />
      )}

      <div className={cn("flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-semibold", meta.accent)}>
        <Icon className="w-3.5 h-3.5" />
        {meta.label}
      </div>

      <div className="px-2.5 py-2 space-y-1.5">
        {data.mediaUrl && (
          <div className="flex items-center gap-1 text-[10px] text-ink-tertiary">
            {data.mediaType === "image" ? <ImageIcon className="w-3 h-3" />
              : data.mediaType === "video" ? <Video className="w-3 h-3" />
              : <FileText className="w-3 h-3" />}
            Adjunto
          </div>
        )}
        <p className="text-[12px] text-ink-secondary line-clamp-2">{data.text || "(sin texto)"}</p>
      </div>

      {data.kind === "MESSAGE" && data.buttons.length > 0 && (
        <div className="border-t border-line-subtle">
          {data.buttons.map((b) => (
            <div key={b.id} className="relative flex items-center justify-between px-2.5 py-1.5 text-[11px] text-ink-primary border-b border-line-subtle last:border-0">
              <span className="truncate">{b.label || "(botón sin texto)"}</span>
              <Handle
                type="source"
                position={Position.Right}
                id={b.id}
                className="!w-2.5 !h-2.5 !bg-brand-500 !relative !right-0 !translate-x-0"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
