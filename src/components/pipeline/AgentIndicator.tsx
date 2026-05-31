import { Bot } from "lucide-react"

interface AgentIndicatorProps {
  agentType?: string
}

export function AgentIndicator({ agentType = "Hermes AI" }: AgentIndicatorProps) {
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-[4px] bg-violet-50 text-violet-600 border border-violet-200">
      <Bot className="w-2.5 h-2.5" />
      Calificado por {agentType}
    </span>
  )
}
