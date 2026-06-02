export const AI_MODELS = {
  FAST:          'gpt-4o-mini' as const,
  SMART:         'gpt-4o'      as const,
  TRANSCRIPTION: 'whisper-1'   as const,
} as const

export type AiModel = typeof AI_MODELS[keyof typeof AI_MODELS]

export const AGENT_CONFIG = {
  CAPTADOR_CLASSIFIER: {
    model:       AI_MODELS.FAST,
    maxTokens:   500,
    temperature: 0.1,
    description: 'Clasificar intención y extraer datos del prospecto',
  },
  CAPTADOR_RESPONDER: {
    model:       AI_MODELS.FAST,
    maxTokens:   200,
    temperature: 0.7,
    description: 'Generar respuesta conversacional para el prospecto',
  },
  ANALITICO_REPORTER: {
    model:       AI_MODELS.SMART,
    maxTokens:   2000,
    temperature: 0.4,
    description: 'Generar reporte semanal ejecutivo con insights',
  },
  DR_CLINIC_STRUCTURER: {
    model:       AI_MODELS.FAST,
    maxTokens:   1500,
    temperature: 0.1,
    description: 'Estructurar dictado en campos de historia clínica',
  },
  DR_CLINIC_TRANSCRIBER: {
    model:       AI_MODELS.TRANSCRIPTION,
    description: 'Transcribir audio del dictado del odontólogo',
  },
} as const

export type AgentConfigKey = keyof typeof AGENT_CONFIG

// USD per 1000 tokens (or per minute for Whisper)
export const MODEL_COSTS = {
  [AI_MODELS.FAST]:          { input: 0.00015, output: 0.0006  },
  [AI_MODELS.SMART]:         { input: 0.005,   output: 0.015   },
  [AI_MODELS.TRANSCRIPTION]: { perMinute: 0.006 },
} as const
