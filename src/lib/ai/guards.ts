import { checkDailyBudget } from './usage-tracker'

type GuardResult =
  | { allowed: true }
  | { allowed: false; reason: string; retryAfter?: number }

export async function canMakeAiCall(params: {
  clinicId:     string
  promptLength: number
}): Promise<GuardResult> {
  if (!process.env.OPENAI_API_KEY) {
    return { allowed: false, reason: 'OPENAI_API_KEY no está configurada' }
  }

  const maxPromptChars = 40_000
  if (params.promptLength > maxPromptChars) {
    return {
      allowed: false,
      reason:  `El prompt es demasiado largo (${params.promptLength} caracteres). Máximo: ${maxPromptChars}`,
    }
  }

  const budget = await checkDailyBudget(params.clinicId)
  if (!budget.allowed) {
    return {
      allowed:    false,
      reason:     `Límite de uso de IA alcanzado hoy ($${budget.spentToday} de $${budget.limitUsd} USD). Se restablece mañana.`,
      retryAfter: secondsUntilMidnight(),
    }
  }

  return { allowed: true }
}

function secondsUntilMidnight(): number {
  const now      = new Date()
  const midnight = new Date(now)
  midnight.setHours(24, 0, 0, 0)
  return Math.floor((midnight.getTime() - now.getTime()) / 1000)
}
