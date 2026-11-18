import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatMetric, type ChannelBreakdown } from "@/lib/growth/metrics"
import { CHANNEL_LABELS } from "@/types/leads"

export function ChannelBreakdownTable({ rows }: { rows: ChannelBreakdown[] }) {
  return (
    <Card className="bg-surface shadow-card border-line-subtle">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-ink-secondary">Desglose por canal</CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-xs text-ink-tertiary">Sin datos suficientes</p>
        ) : (
          <div className="space-y-2">
            <div className="grid grid-cols-4 text-[11px] font-medium text-ink-tertiary uppercase tracking-wide pb-1 border-b border-line-subtle">
              <span>Canal</span>
              <span className="text-right">Leads</span>
              <span className="text-right">Inversión</span>
              <span className="text-right">CPL</span>
            </div>
            {rows.map((row) => (
              <div key={row.channel} className="grid grid-cols-4 text-xs py-1 items-center">
                <span className="text-ink-secondary font-medium">{CHANNEL_LABELS[row.channel]}</span>
                <span className="text-right text-ink-primary tabular-nums">{row.leads}</span>
                <span className="text-right text-ink-primary tabular-nums">{formatMetric(row.spend, "currency")}</span>
                <span className="text-right text-ink-primary tabular-nums">{formatMetric(row.cpl, "currency")}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
