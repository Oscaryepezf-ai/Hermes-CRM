import OpenAI from 'openai'
import { AGENT_CONFIG, type AgentConfigKey } from './models'
import { logAiUsage, calculateCost } from './usage-tracker'
import { canMakeAiCall } from './guards'
import type { AiResponse, AiCallOptions, TranscriptionOptions, ImageAnalysisOptions, EmbeddingOptions } from './types'

// ── Singleton — created once, shared across all agents ───
let _client: OpenAI | null = null

function getClient(): OpenAI {
  if (!_client) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY no está configurada')
    }
    _client = new OpenAI({
      apiKey:     process.env.OPENAI_API_KEY,
      timeout:    30_000,
      maxRetries: 2,
    })
  }
  return _client
}

// ── Chat completion ───────────────────────────────────────
export async function callAI(options: AiCallOptions): Promise<AiResponse<string>> {
  const config = AGENT_CONFIG[options.agentKey]
  const start  = Date.now()

  const guard = await canMakeAiCall({
    clinicId:     options.clinicId,
    promptLength: options.systemPrompt.length + options.userPrompt.length,
  })
  if (!guard.allowed) {
    return { success: false, error: guard.reason, errorCode: 'BUDGET_EXCEEDED', retryable: false }
  }

  try {
    const res = await getClient().chat.completions.create({
      model:           config.model,
      max_tokens:      'maxTokens' in config ? config.maxTokens : 1000,
      temperature:     'temperature' in config ? config.temperature : 0.5,
      response_format: options.responseJson ? { type: 'json_object' } : { type: 'text' },
      messages: [
        { role: 'system', content: options.systemPrompt },
        { role: 'user',   content: options.userPrompt   },
      ],
    })

    const latencyMs    = Date.now() - start
    const tokensInput  = res.usage?.prompt_tokens     ?? 0
    const tokensOutput = res.usage?.completion_tokens ?? 0
    const content      = res.choices[0]?.message?.content ?? ''

    logAiUsage({
      clinicId: options.clinicId, agentKey: options.agentKey,
      model: config.model, tokensInput, tokensOutput, latencyMs, success: true,
    })

    return {
      success:    true,
      data:       content,
      model:      config.model,
      tokensUsed: { input: tokensInput, output: tokensOutput, total: tokensInput + tokensOutput },
      costUsd:    calculateCost({ model: config.model, tokensInput, tokensOutput }),
      latencyMs,
    }
  } catch (error: unknown) {
    const latencyMs = Date.now() - start
    const errorCode = mapError(error)
    logAiUsage({
      clinicId: options.clinicId, agentKey: options.agentKey,
      model: config.model, latencyMs, success: false, errorCode,
    })
    console.error(`[ai] ${options.agentKey} failed:`, (error as Error).message)
    return { success: false, error: readable(errorCode), errorCode: errorCode as import('./types').AiErrorCode, retryable: isRetryable(errorCode) }
  }
}

// ── JSON wrapper ──────────────────────────────────────────
export async function callAIJson<T>(options: AiCallOptions): Promise<AiResponse<T>> {
  const result = await callAI({ ...options, responseJson: true })
  if (!result.success) return result

  try {
    return { ...result, data: JSON.parse(result.data) as T }
  } catch {
    return { success: false, error: 'La IA devolvió un JSON inválido', errorCode: 'INVALID_JSON', retryable: true }
  }
}

// ── Audio transcription ───────────────────────────────────
export async function transcribeAudio(options: TranscriptionOptions): Promise<AiResponse<string>> {
  const start = Date.now()

  const guard = await canMakeAiCall({ clinicId: options.clinicId, promptLength: 0 })
  if (!guard.allowed) {
    return { success: false, error: guard.reason, errorCode: 'BUDGET_EXCEEDED', retryable: false }
  }

  try {
    const ext       = options.mimeType.split('/')[1]
    const audioFile = new File([new Uint8Array(options.audioBuffer)], `dictado.${ext}`, { type: options.mimeType })

    const transcription = await getClient().audio.transcriptions.create({
      file:     audioFile,
      model:    'whisper-1',
      language: options.language ?? 'es',
      prompt:   options.prompt ?? 'Odontología, historia clínica, diagnóstico, tratamiento, ortodoncia, endodoncia, implante',
    })

    const latencyMs    = Date.now() - start
    const audioDuration = (options.audioBuffer.length / 1_000_000) * 60

    logAiUsage({
      clinicId: options.clinicId, agentKey: 'DR_CLINIC_TRANSCRIBER',
      model: 'whisper-1', audioDuration, latencyMs, success: true,
    })

    return {
      success:    true,
      data:       transcription.text,
      model:      'whisper-1',
      tokensUsed: { input: 0, output: 0, total: 0 },
      costUsd:    calculateCost({ model: 'whisper-1', audioDuration }),
      latencyMs,
    }
  } catch (error: unknown) {
    const latencyMs = Date.now() - start
    const errorCode = mapError(error)
    logAiUsage({
      clinicId: options.clinicId, agentKey: 'DR_CLINIC_TRANSCRIBER',
      model: 'whisper-1', latencyMs, success: false, errorCode,
    })
    return { success: false, error: readable(errorCode), errorCode: errorCode as import('./types').AiErrorCode, retryable: false }
  }
}

// ── Image analysis (vision) — Agente de Ventas Consultivo ─
export async function analyzeImage(options: ImageAnalysisOptions): Promise<AiResponse<string>> {
  const config = AGENT_CONFIG.SALES_AGENT_VISION
  const start  = Date.now()

  const guard = await canMakeAiCall({ clinicId: options.clinicId, promptLength: options.context.length })
  if (!guard.allowed) {
    return { success: false, error: guard.reason, errorCode: 'BUDGET_EXCEEDED', retryable: false }
  }

  try {
    const res = await getClient().chat.completions.create({
      model:      config.model,
      max_tokens: config.maxTokens,
      messages: [
        {
          role: 'system',
          content: `Analiza esta imagen enviada por un prospecto en una conversación de ventas. ${options.context}
Describe SOLO lo relevante para entender su necesidad o situación — no describas estética genérica.
Si es una radiografía o foto dental: describe lo que un asistente (no diagnóstico médico) notaría.
Si es una captura de pantalla: describe qué información contiene.
Si es un comprobante de pago: extrae el monto y la fecha si son legibles.
Máximo 3 oraciones.`,
        },
        {
          role: 'user',
          content: [{ type: 'image_url', image_url: { url: options.imageUrl } }],
        },
      ],
    })

    const latencyMs    = Date.now() - start
    const tokensInput  = res.usage?.prompt_tokens     ?? 0
    const tokensOutput = res.usage?.completion_tokens ?? 0
    const content      = res.choices[0]?.message?.content ?? 'Imagen recibida'

    logAiUsage({
      clinicId: options.clinicId, agentKey: 'SALES_AGENT_VISION',
      model: config.model, tokensInput, tokensOutput, latencyMs, success: true,
    })

    return {
      success:    true,
      data:       content,
      model:      config.model,
      tokensUsed: { input: tokensInput, output: tokensOutput, total: tokensInput + tokensOutput },
      costUsd:    calculateCost({ model: config.model, tokensInput, tokensOutput }),
      latencyMs,
    }
  } catch (error: unknown) {
    const latencyMs = Date.now() - start
    const errorCode = mapError(error)
    logAiUsage({
      clinicId: options.clinicId, agentKey: 'SALES_AGENT_VISION',
      model: config.model, latencyMs, success: false, errorCode,
    })
    console.error('[ai] SALES_AGENT_VISION failed:', (error as Error).message)
    return { success: false, error: readable(errorCode), errorCode: errorCode as import('./types').AiErrorCode, retryable: isRetryable(errorCode) }
  }
}

// ── Embeddings — base de conocimiento (RAG) ───────────────
export async function generateEmbedding(options: EmbeddingOptions): Promise<AiResponse<number[]>> {
  const config = AGENT_CONFIG.SALES_AGENT_EMBEDDING
  const start  = Date.now()

  const guard = await canMakeAiCall({ clinicId: options.clinicId, promptLength: options.text.length })
  if (!guard.allowed) {
    return { success: false, error: guard.reason, errorCode: 'BUDGET_EXCEEDED', retryable: false }
  }

  try {
    const res = await getClient().embeddings.create({
      model: config.model,
      input: options.text,
    })

    const latencyMs   = Date.now() - start
    const tokensInput = res.usage?.prompt_tokens ?? 0
    const embedding    = res.data[0].embedding

    logAiUsage({
      clinicId: options.clinicId, agentKey: 'SALES_AGENT_EMBEDDING',
      model: config.model, tokensInput, tokensOutput: 0, latencyMs, success: true,
    })

    return {
      success:    true,
      data:       embedding,
      model:      config.model,
      tokensUsed: { input: tokensInput, output: 0, total: tokensInput },
      costUsd:    calculateCost({ model: config.model, tokensInput, tokensOutput: 0 }),
      latencyMs,
    }
  } catch (error: unknown) {
    const latencyMs = Date.now() - start
    const errorCode = mapError(error)
    logAiUsage({
      clinicId: options.clinicId, agentKey: 'SALES_AGENT_EMBEDDING',
      model: config.model, latencyMs, success: false, errorCode,
    })
    console.error('[ai] SALES_AGENT_EMBEDDING failed:', (error as Error).message)
    return { success: false, error: readable(errorCode), errorCode: errorCode as import('./types').AiErrorCode, retryable: isRetryable(errorCode) }
  }
}

// ── Helpers ───────────────────────────────────────────────
function mapError(error: unknown): string {
  const e = error as { status?: number; code?: string; name?: string }
  if (e.code === 'insufficient_quota')                      return 'INSUFFICIENT_QUOTA'
  if (e.status === 429 || e.code === 'rate_limit_exceeded') return 'RATE_LIMIT'
  if (e.status === 401 || e.code === 'invalid_api_key')     return 'INVALID_API_KEY'
  if (e.status === 400 && e.code === 'context_length_exceeded') return 'CONTEXT_TOO_LONG'
  if (e.status === 400 && e.code === 'content_policy_violation') return 'CONTENT_FILTERED'
  if (e.name === 'APIConnectionTimeoutError')                return 'TIMEOUT'
  return 'UNKNOWN'
}

function isRetryable(code: string): boolean {
  return ['RATE_LIMIT', 'TIMEOUT', 'UNKNOWN'].includes(code)
}

function readable(code: string): string {
  const msgs: Record<string, string> = {
    RATE_LIMIT:      'El servicio de IA está ocupado. Intenta en unos segundos.',
    INSUFFICIENT_QUOTA: 'La cuenta de OpenAI no tiene saldo disponible. Revisa la facturación en platform.openai.com/settings/organization/billing.',
    INVALID_API_KEY: 'La API key de OpenAI no es válida.',
    CONTEXT_TOO_LONG:'El texto es demasiado largo para procesar.',
    CONTENT_FILTERED:'Contenido filtrado por políticas de seguridad.',
    BUDGET_EXCEEDED: 'Límite de uso de IA alcanzado por hoy.',
    TIMEOUT:         'La IA tardó demasiado. Intenta de nuevo.',
    INVALID_JSON:    'Error al procesar la respuesta de la IA.',
    UNKNOWN:         'Error inesperado en el servicio de IA.',
  }
  return msgs[code] ?? msgs.UNKNOWN
}
