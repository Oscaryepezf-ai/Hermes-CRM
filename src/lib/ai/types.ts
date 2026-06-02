import type { AgentConfigKey, AiModel } from './models'

export type AiErrorCode =
  | 'RATE_LIMIT'
  | 'INVALID_API_KEY'
  | 'CONTEXT_TOO_LONG'
  | 'CONTENT_FILTERED'
  | 'BUDGET_EXCEEDED'
  | 'TIMEOUT'
  | 'INVALID_JSON'
  | 'UNKNOWN'

export type AiResponse<T = string> =
  | {
      success:    true
      data:       T
      model:      AiModel
      tokensUsed: { input: number; output: number; total: number }
      costUsd:    number
      latencyMs:  number
    }
  | {
      success:   false
      error:     string
      errorCode: AiErrorCode
      retryable: boolean
    }

export type AiCallOptions = {
  agentKey:      AgentConfigKey
  clinicId:      string
  systemPrompt:  string
  userPrompt:    string
  responseJson?: boolean
  timeoutMs?:    number
}

export type TranscriptionOptions = {
  clinicId:    string
  audioBuffer: Buffer
  mimeType:    'audio/webm' | 'audio/mp3' | 'audio/wav' | 'audio/m4a'
  language?:   string
  prompt?:     string
}
