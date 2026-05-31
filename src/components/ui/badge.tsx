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
          "bg-[#EEF3FC] text-[#1E4A8A] border-transparent",
        calificado:
          "bg-[#F2EFFE] text-[#4A3B9E] border-transparent",
        "cita-agendada":
          "bg-[#FEF9EE] text-[#8A5C0A] border-transparent",
        "en-consulta":
          "bg-[#EDFAF4] text-[#15694A] border-transparent",
        "paciente-activo":
          "bg-[#EDFAF4] text-[#065F46] border-transparent",
        inactivo:
          "bg-[#F0F2F6] text-[#4A5568] border-transparent",
        perdido:
          "bg-[#FEF2F4] text-[#9B2335] border-transparent",

        // ── User roles ────────────────────────────────────────────────
        admin:
          "bg-violet-50 text-violet-700 border border-violet-200",
        doctor:
          "bg-blue-50 text-blue-700 border border-blue-200",
        receptionist:
          "bg-teal-50 text-teal-700 border border-teal-200",

        // ── Priority ──────────────────────────────────────────────────
        "priority-high":
          "bg-[#FEF2F4] text-[#9B2335] border-transparent",
        "priority-normal":
          "bg-[#EEF3FC] text-[#1E4A8A] border-transparent",
        "priority-low":
          "bg-[#F0F2F6] text-[#4A5568] border-transparent",

        // ── Plan ──────────────────────────────────────────────────────
        "plan-basic":
          "bg-inset text-ink-secondary border-transparent",
        "plan-pro":
          "bg-brand-50 text-brand-600 border-transparent",
        "plan-elite":
          "bg-amber-50 text-amber-700 border-transparent",
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
