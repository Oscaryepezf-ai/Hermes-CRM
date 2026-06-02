import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-[9999px] border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-all focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        // ── Shadcn defaults ───────────────────────────────────────────
        default:
          "bg-primary text-primary-foreground [a]:hover:bg-primary/80",
        secondary:
          "bg-secondary text-secondary-foreground [a]:hover:bg-secondary/80",
        destructive:
          "bg-destructive/10 text-destructive focus-visible:ring-destructive/20 dark:bg-destructive/20 [a]:hover:bg-destructive/20",
        outline:
          "border-border text-foreground [a]:hover:bg-muted",
        ghost:
          "hover:bg-muted hover:text-muted-foreground",
        link:
          "text-primary underline-offset-4 hover:underline",

        // ── Journey states ────────────────────────────────────────────
        prospecto:
          "bg-[#EEF3FC] text-[#1E4A8A] border-transparent dark:bg-blue-950/50 dark:text-blue-300",
        calificado:
          "bg-[#F2EFFE] text-[#4A3B9E] border-transparent dark:bg-violet-950/50 dark:text-violet-300",
        "cita-agendada":
          "bg-[#FEF9EE] text-[#8A5C0A] border-transparent dark:bg-amber-950/50 dark:text-amber-300",
        "en-consulta":
          "bg-[#EDFAF4] text-[#15694A] border-transparent dark:bg-emerald-950/50 dark:text-emerald-300",
        "paciente-activo":
          "bg-[#EDFAF4] text-[#065F46] border-transparent dark:bg-emerald-950/50 dark:text-emerald-400",
        inactivo:
          "bg-[#F0F2F6] text-[#4A5568] border-transparent dark:bg-slate-800/60 dark:text-slate-400",
        perdido:
          "bg-[#FEF2F4] text-[#9B2335] border-transparent dark:bg-rose-950/50 dark:text-rose-300",

        // ── User roles ────────────────────────────────────────────────
        admin:
          "bg-violet-50 text-violet-700 border border-violet-200 dark:bg-violet-950/50 dark:text-violet-300 dark:border-violet-800",
        doctor:
          "bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800",
        receptionist:
          "bg-teal-50 text-teal-700 border border-teal-200 dark:bg-teal-950/50 dark:text-teal-300 dark:border-teal-800",

        // ── Priority ──────────────────────────────────────────────────
        "priority-high":
          "bg-[#FEF2F4] text-[#9B2335] border-transparent dark:bg-rose-950/50 dark:text-rose-300",
        "priority-normal":
          "bg-[#EEF3FC] text-[#1E4A8A] border-transparent dark:bg-blue-950/50 dark:text-blue-300",
        "priority-low":
          "bg-[#F0F2F6] text-[#4A5568] border-transparent dark:bg-slate-800/60 dark:text-slate-400",

        // ── Plan ──────────────────────────────────────────────────────
        "plan-basic":
          "bg-inset text-ink-secondary border-transparent",
        "plan-pro":
          "bg-brand-50 text-brand-600 border-transparent",
        "plan-elite":
          "bg-amber-50 text-amber-700 border-transparent dark:bg-amber-950/50 dark:text-amber-300",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  render,
  ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      { className: cn(badgeVariants({ variant }), className) },
      props
    ),
    render,
    state: { slot: "badge", variant },
  })
}

export { Badge, badgeVariants }
