import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type Tone = "brand" | "violet" | "emerald" | "amber";

const TONES: Record<Tone, { chip: string; icon: string }> = {
  brand:   { chip: "bg-brand-50",    icon: "text-brand-600"   },
  violet:  { chip: "bg-violet-50",   icon: "text-violet-600"  },
  emerald: { chip: "bg-emerald-50",  icon: "text-emerald-600" },
  amber:   { chip: "bg-amber-50",    icon: "text-amber-600"   },
};

interface MetricCardProps {
  title:           string;
  value:           string;
  change?:         string;
  changePositive?: boolean;
  subtitle?:       string;
  icon:            LucideIcon;
  /** Color del chip del icono (tarjetas normales). */
  tone?:           Tone;
  /** Pieza destacada: la métrica más importante de la pantalla (una sola por fila). */
  featured?:       boolean;
}

export function MetricCard({
  title, value, change, changePositive = true, subtitle,
  icon: Icon, tone = "brand", featured = false,
}: MetricCardProps) {
  const t = TONES[tone];

  return (
    <div
      className={cn(
        "rounded-2xl p-5 transition-ui",
        featured
          ? "bg-brand-gradient text-white hover:-translate-y-0.5"
          : "bg-surface hover:-translate-y-0.5"
      )}
      style={{ boxShadow: featured ? "var(--shadow-brand)" : "var(--shadow-card)" }}
    >
      <div className="flex items-center justify-between">
        <p className={cn("text-[13px] font-medium", featured ? "text-white/85" : "text-ink-tertiary")}>
          {title}
        </p>
        <div
          className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center",
            featured ? "bg-white/20" : t.chip
          )}
        >
          <Icon className={cn("w-5 h-5", featured ? "text-white" : t.icon)} />
        </div>
      </div>

      <p
        className={cn(
          "mt-3 text-[30px] font-bold leading-none tabular-nums tracking-[-0.03em]",
          featured ? "text-white" : "text-ink-primary"
        )}
      >
        {value}
      </p>

      {change && (
        <div className="mt-3 flex items-center gap-1.5">
          <span
            className={cn(
              "inline-flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full",
              featured
                ? "bg-white/20 text-white"
                : changePositive
                  ? "text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/60"
                  : "text-rose-700 bg-rose-50 dark:text-rose-400 dark:bg-rose-950/60"
            )}
          >
            {changePositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {change}
          </span>
          {subtitle && (
            <span className={cn("text-xs", featured ? "text-white/80" : "text-ink-tertiary")}>{subtitle}</span>
          )}
        </div>
      )}
      {!change && subtitle && (
        <p className={cn("mt-3 text-xs", featured ? "text-white/80" : "text-ink-tertiary")}>{subtitle}</p>
      )}
    </div>
  );
}
