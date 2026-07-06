import { db } from '@/lib/db'
import { z } from 'zod'
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
  knowledgeBase: string
  /** 'basico' = Captador original. 'consultivo' = Agente de Ventas con RAG/memoria/multimodal. 'flujo' = árbol de botones sin código. */
  mode:          'basico' | 'consultivo' | 'flujo'
  /** Id del Flow activo — solo relevante cuando mode === 'flujo'. */
  flowId:        string | null
}

function getEcuadorHour(): number {
  const dateStr = new Date().toLocaleString('en-US', { timeZone: 'America/Guayaquil' })
  return new Date(dateStr).getHours()
}

const ConfigSchema = z.object({
  businessHours: z.object({
    start: z.number().int().min(0).max(23),
    end:   z.number().int().min(0).max(23),
  }).default({ start: parseInt(process.env.CAPTADOR_START_HOUR ?? '8'), end: parseInt(process.env.CAPTADOR_END_HOUR ?? '20') }),
  maxTurns:     z.number().int().min(1).max(20).default(parseInt(process.env.CAPTADOR_MAX_TURNS ?? '4')),
  tone:         z.enum(['formal', 'amigable']).default('amigable'),
  specialties:  z.array(z.string()).default(['Ortodoncia', 'Implantes', 'Blanqueamiento', 'Limpieza', 'Cirugía']),
  knowledgeBase:z.string().default(''),
  mode:         z.enum(['basico', 'consultivo', 'flujo']).default('basico'),
  flowId:       z.string().nullable().default(null),
})

function parseConfig(raw: unknown): CaptadorConfig {
  const result = ConfigSchema.safeParse(raw ?? {})
  if (!result.success) {
    console.error('[captador] captadorConfig malformado — usando defaults:', result.error.flatten())
  }
  return result.success ? result.data : ConfigSchema.parse({})
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

  const hour = getEcuadorHour()
  const isBusinessHours = hour >= config.businessHours.start && hour < config.businessHours.end

  if (conv?.status === 'HANDED_OFF') {
    return { ...base, shouldAgentRespond: false, reason: 'already_handed_off', isBusinessHours }
  }

  // Los modos consultivo y flujo no tienen límite de turnos clásico.
  if (conv && conv.turnCount >= config.maxTurns && config.mode === 'basico') {
    return { ...base, shouldAgentRespond: false, reason: 'max_turns_reached', isBusinessHours }
  }

  return { ...base, shouldAgentRespond: true, reason: 'agent_active', isBusinessHours }
}
