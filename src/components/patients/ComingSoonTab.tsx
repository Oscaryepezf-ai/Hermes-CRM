import { Lock } from "lucide-react"

export function ComingSoonTab({ title, description }: { title: string; description: string }) {
  return (
    <div className="bg-surface border border-line-subtle rounded-[12px] p-6 shadow-card flex items-start gap-3">
      <div className="w-10 h-10 rounded-[10px] bg-inset flex items-center justify-center flex-shrink-0">
        <Lock className="w-5 h-5 text-ink-tertiary" />
      </div>
      <div>
        <h3 className="text-[14px] font-bold text-ink-primary">{title}</h3>
        <p className="text-[12px] text-ink-tertiary mt-1 max-w-md">{description}</p>
      </div>
    </div>
  )
}
