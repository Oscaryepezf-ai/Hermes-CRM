import { cn } from "@/lib/utils";

type NmBadgeVariant = "active" | "pro" | "elite" | "pending" | "lost" | "neutral";

interface NmBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: NmBadgeVariant;
  dot?: boolean;
}

const VARIANT_CLASSES: Record<NmBadgeVariant, string> = {
  active:  "bg-nm-green/30 text-nm-green-dark border border-nm-green",
  pro:     "bg-nm-orange/20 text-nm-orange-dark border border-nm-orange",
  elite:   "bg-purple-100 text-purple-700 border border-purple-300",
  pending: "bg-yellow-100 text-yellow-700 border border-yellow-300",
  lost:    "bg-nm-red-soft text-nm-red-dark border border-red-200",
  neutral: "bg-nm-surface text-nm-text-secondary border border-nm-border",
};

export function NmBadge({
  children,
  className,
  variant = "neutral",
  dot = false,
  ...props
}: NmBadgeProps) {
  return (
    <span
      className={cn(
        "text-nm-xs font-medium uppercase tracking-wide",
        "px-2.5 py-0.5 rounded-nm-full",
        "inline-flex items-center gap-1",
        VARIANT_CLASSES[variant],
        className
      )}
      {...props}
    >
      {dot && (
        <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70 flex-shrink-0" />
      )}
      {children}
    </span>
  );
}
