import { cn } from "@/lib/utils"

interface LabelBadgeProps {
  name:      string
  color:     string
  emoji?:    string | null
  size?:     "sm" | "md"
  onRemove?: () => void
  className?: string
}

export function LabelBadge({ name, color, emoji, size = "sm", onRemove, className }: LabelBadgeProps) {
  const hex = color.startsWith("#") ? color : "#94A3B8"

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border font-medium",
        size === "sm" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-1 text-xs",
        className
      )}
      style={{
        backgroundColor: hex + "22",
        borderColor:     hex + "55",
        color:           hex,
      }}
    >
      {emoji && <span>{emoji}</span>}
      {name}
      {onRemove && (
        <button
          onClick={e => { e.stopPropagation(); onRemove() }}
          className="ml-0.5 rounded-full hover:opacity-70 leading-none"
        >
          ×
        </button>
      )}
    </span>
  )
}
