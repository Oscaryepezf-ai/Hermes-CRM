import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { formatMetric, type MetricResult } from "@/lib/growth/metrics"

type Stage = { label: string; count: number; rate: MetricResult | null }

export function FunnelCard({ stages }: { stages: Stage[] }) {
  const base = stages[0]?.count ?? 0

  return (
    <Card className="bg-surface shadow-card border-line-subtle">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-ink-secondary">Embudo comercial de la cohorte</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {stages.map((stage, idx) => {
            const pct = base > 0 ? Math.round((stage.count / base) * 100) : 0
            return (
              <div key={`${stage.label}-${idx}`}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-ink-secondary font-medium">{stage.label}</span>
                  <span className="text-ink-tertiary">
                    {stage.count} · {stage.rate !== null ? formatMetric(stage.rate, "percent") : `${pct}%`}
                  </span>
                </div>
                <Progress value={pct} className="h-2" />
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
