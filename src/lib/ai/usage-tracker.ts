import { db } from '@/lib/db'
import { MODEL_COSTS, type AiModel } from './models'

type LogParams = {
  clinicId:       string
  agentKey:       string
  model:          AiModel
  tokensInput?:   number
  tokensOutput?:  number
  audioDuration?: number
  latencyMs:      number
  success:        boolean
  errorCode?:     string
}

export function calculateCost(params: {
  model:          AiModel
  tokensInput?:   number
  tokensOutput?:  number
  audioDuration?: number
}): number {
  const costs = MODEL_COSTS[params.model as keyof typeof MODEL_COSTS]

  if ('perMinute' in costs && params.audioDuration) {
    return (params.audioDuration / 60) * costs.perMinute
  }
  if ('input' in costs) {
    const inputCost  = ((params.tokensInput  ?? 0) / 1000) * costs.input
    const outputCost = ((params.tokensOutput ?? 0) / 1000) * costs.output
    return inputCost + outputCost
  }
  return 0
}

// Fire-and-forget — never blocks the AI response
export function logAiUsage(params: LogParams): void {
  const costUsd = calculateCost({
    model:         params.model,
    tokensInput:   params.tokensInput,
    tokensOutput:  params.tokensOutput,
    audioDuration: params.audioDuration,
  })

  db.aiUsageLog.create({
    data: {
      clinicId:      params.clinicId,
      agentKey:      params.agentKey,
      model:         params.model,
      tokensInput:   params.tokensInput  ?? 0,
      tokensOutput:  params.tokensOutput ?? 0,
      audioDuration: params.audioDuration,
      costUsd,
      latencyMs:     params.latencyMs,
      success:       params.success,
      errorCode:     params.errorCode,
    },
  }).catch(err => console.error('[ai-tracker] failed to log:', err))
}

export async function checkDailyBudget(clinicId: string): Promise<{
  allowed:    boolean
  spentToday: number
  limitUsd:   number
}> {
  const limitUsd   = parseFloat(process.env.AI_MAX_COST_PER_CLINIC_DAY ?? '0.50')
  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)

  const result = await db.aiUsageLog.aggregate({
    where: { clinicId, createdAt: { gte: startOfDay }, success: true },
    _sum:  { costUsd: true },
  })

  const spentToday = result._sum.costUsd ?? 0
  return {
    allowed:    spentToday < limitUsd,
    spentToday: Math.round(spentToday * 10000) / 10000,
    limitUsd,
  }
}

export async function getMonthlyUsageSummary(clinicId: string) {
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const logs = await db.aiUsageLog.groupBy({
    by:     ['agentKey', 'model'],
    where:  { clinicId, createdAt: { gte: startOfMonth } },
    _sum:   { costUsd: true, tokensInput: true, tokensOutput: true },
    _count: { id: true },
  })

  const total = logs.reduce((acc, l) => acc + (l._sum.costUsd ?? 0), 0)
  return {
    byAgent:   logs,
    totalUsd:  Math.round(total * 10000) / 10000,
    callCount: logs.reduce((acc, l) => acc + l._count.id, 0),
  }
}
