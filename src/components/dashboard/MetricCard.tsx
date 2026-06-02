import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface MetricCardProps {
  title:           string;
  value:           string;
  change?:         string;
  changePositive?: boolean;
  subtitle?:       string;
  icon:            LucideIcon;
  iconBg?:         string;
  iconColor?:      string;
}

export function MetricCard({
  title, value, change, changePositive = true, subtitle,
  icon: Icon,
  iconBg    = "bg-brand-50",
  iconColor = "text-brand-600",
}: MetricCardProps) {
  return (
    <div className="bg-surface border border-line-subtle rounded-[16px] p-5 shadow-card hover:shadow-card-hover hover:border-line-soft transition-ui">
      {/* Icon */}
      <div className={cn("w-9 h-9 rounded-[10px] flex items-center justify-center", iconBg)}>
        <Icon className={cn("w-[18px] h-[18px]", iconColor)} />
      </div>

      {/* Label */}
      <p className="mt-3 text-[11px] font-medium text-ink-tertiary uppercase tracking-[0.05em]">
        {title}
      </p>

      {/* Value */}
      <p className="mt-1 text-[28px] font-bold text-ink-primary leading-none tabular-nums tracking-[-0.04em]">
        {value}
      </p>

      {/* Change badge */}
      {change && (
        <div className="mt-1.5 flex items-center gap-1">
          <span
            className={cn(
              "inline-flex items-center gap-0.5 text-[11px] font-medium px-1.5 py-0.5 rounded-[4px]",
              changePositive
                  ? "text-[#15694A] bg-[#EDFAF4] dark:text-emerald-400 dark:bg-emerald-950/60"
                  : "text-[#9B2335] bg-[#FEF2F4] dark:text-rose-400 dark:bg-rose-950/60"
            )}
          >
            {changePositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {change}
          </span>
          {subtitle && <span className="text-[11px] text-ink-tertiary">{subtitle}</span>}
        </div>
      )}
      {!change && subtitle && (
        <p className="mt-1.5 text-[11px] text-ink-tertiary">{subtitle}</p>
      )}
    </div>
  );
}
