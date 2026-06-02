import type { DentalTreatment } from '@prisma/client'
import { TREATMENT_LABELS } from '@/types/leads'
import { callAIJson } from '@/lib/ai/client'

export type LeadIntent =
  | 'consulta_precio'
  | 'agendar_cita'
  | 'informacion_general'
  | 'urgencia_dental'
  | 'seguimiento'
  | 'queja_o_problema'
  | 'fuera_de_contexto'
  | 'saludo_inicial'

export type QualificationResult = {
  intent:            LeadIntent
  treatment:         DentalTreatment | null
  urgency:           'alta' | 'media' | 'baja'
  sentiment:         'positivo' | 'neutro' | 'negativo'
  extractedName:     string | null
  extractedBudget:   string | null
  extractedBestTime: string | null
  shouldRespond:     boolean
  shouldHandOff:     boolean
  confidence:        number
}

const FALLBACK: QualificationResult = {
  intent: 'saludo_inicial', treatment: null, urgency: 'media', sentiment: 'neutro',
  extractedName: null, extractedBudget: null, extractedBestTime: null,
  shouldRespond: true, shouldHandOff: false, confidence: 0.5,
}

export async function qualifyMessage(params: {
  message:             string
  conversationHistory: { role: 'user' | 'assistant'; content: string }[]
  clinicName:          string
  clinicId:            string
  collectedSoFar:      Record<string, unknown>
}): Promise<QualificationResult> {
  const treatmentsList = Object.entries(TREATMENT_LABELS)
    .map(([k, v]) => `${k}: ${v}`)
    .join(', ')

  const systemPrompt = `Analizador de mensajes para clínica dental "${params.clinicName}".
Extrae datos de calificación comercial del mensaje del prospecto.
TRATAMIENTOS: ${treatmentsList}
Responde SOLO con este JSON exacto:
{
  "intent": "consulta_precio|agendar_cita|informacion_general|urgencia_dental|seguimiento|queja_o_problema|fuera_de_contexto|saludo_inicial",
  "treatment": "ORTODONCIA|IMPLANTES|BLANQUEAMIENTO|ENDODONCIA|LIMPIEZA|CIRUGIA|PROTESIS|OTRO|null",
  "urgency": "alta|media|baja",
  "sentiment": "positivo|neutro|negativo",
  "extractedName": "nombre o null",
  "extractedBudget": "presupuesto mencionado o null",
  "extractedBestTime": "horario preferido o null",
  "shouldRespond": true,
  "shouldHandOff": false,
  "confidence": 0.9
}
shouldHandOff=true SOLO si: urgencia_dental con dolor severo, queja_o_problema, o pide hablar con persona.
shouldRespond=false SOLO si: fuera_de_contexto irrelevante.`

  const historyContext = params.conversationHistory.slice(-6)
    .map(m => `${m.role === 'user' ? 'Prospecto' : 'Hermes'}: ${m.content}`)
    .join('\n')

  const result = await callAIJson<QualificationResult>({
    agentKey:     'CAPTADOR_CLASSIFIER',
    clinicId:     params.clinicId,
    systemPrompt,
    userPrompt:   historyContext
      ? `Historial:\n${historyContext}\n\nMensaje actual: ${params.message}`
      : params.message,
  })

  return result.success ? result.data : FALLBACK
}
