import { db } from '@/lib/db'
import type { MarketingChannel } from '@prisma/client'

export type RouterDecision = {
  shouldAgentRespond:   boolean
  reason:               'agent_active' | 'agent_disabled' | 'out_of_hours' | 'already_handed_off' | 'max_turns_reached'
  clinic:               Awaited<ReturnType<typeof db.clinic.findUniqueOrThrow>>
  config:               CaptadorConfig
  existingConversation: Awaited<ReturnType<typeof db.agentConversation.findUnique>>
  isBusinessHours:      boolean
}

export type CaptadorConfig = {
  businessHours: { start: number; end: number }
  maxTurns:      number
  tone:          'formal' | 'amigable'
  specialties:   string[]
}

function getColombiaHour(): number {
  const dateStr = new Date().toLocaleString('en-US', { timeZone: 'America/Bogota' })
  return new Date(dateStr).getHours()
}

function parseConfig(raw: unknown): CaptadorConfig {
  const c = (raw ?? {}) as Record<string, unknown>
  return {
    businessHours: {
      start: (c.businessHours as { start?: number })?.start ?? parseInt(process.env.CAPTADOR_START_HOUR ?? '8'),
      end:   (c.businessHours as { end?: number })?.end   ?? parseInt(process.env.CAPTADOR_END_HOUR   ?? '20'),
    },
    maxTurns:   (c.maxTurns   as number | undefined) ?? parseInt(process.env.CAPTADOR_MAX_TURNS ?? '4'),
    tone:       (c.tone       as 'formal' | 'amigable' | undefined) ?? 'amigable',
    specialties: (c.specialties as string[] | undefined) ?? ['Ortodoncia', 'Implantes', 'Blanqueamiento', 'Limpieza', 'Cirugía'],
  }
}

export async function routeIncomingMessage(params: {
  leadId:  string
  channel: MarketingChannel
}): Promise<RouterDecision> {
  const lead = await db.lead.findUnique({
    where:   { id: params.leadId },
    include: { clinic: true, agentConversation: true },
  })
  if (!lead) throw new Error(`Lead ${params.leadId} not found`)

  const clinic = lead.clinic
  const config = parseConfig(clinic.captadorConfig)
  const conv   = lead.agentConversation

  const base = { clinic, config, existingConversation: conv, isBusinessHours: false }

  if (!clinic.captadorActive) {
    return { ...base, shouldAgentRespond: false, reason: 'agent_disabled' }
  }

  const hour = getColombiaHour()
  const isBusinessHours = hour >= config.businessHours.start && hour < config.businessHours.end

  if (conv?.status === 'HANDED_OFF') {
    return { ...base, shouldAgentRespond: false, reason: 'already_handed_off', isBusinessHours }
  }

  if (conv && conv.turnCount >= config.maxTurns) {
    return { ...base, shouldAgentRespond: false, reason: 'max_turns_reached', isBusinessHours }
  }

  return { ...base, shouldAgentRespond: true, reason: 'agent_active', isBusinessHours }
}
