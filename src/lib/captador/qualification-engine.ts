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
  // ─── Solo usados por el modo "consultivo" del Agente de Ventas ───
  detectedNeed:       string | null
  newObjection:       string | null
  resolvedObjection:  string | null
  emotionalState:     string | null
}

const FALLBACK: QualificationResult = {
  intent: 'saludo_inicial', treatment: null, urgency: 'media', sentiment: 'neutro',
  extractedName: null, extractedBudget: null, extractedBestTime: null,
  shouldRespond: true, shouldHandOff: false, confidence: 0.5,
  detectedNeed: null, newObjection: null, resolvedObjection: null, emotionalState: null,
}

export async function qualifyMessage(params: {
  message:             string
  conversationHistory: { role: 'user' | 'assistant'; content: string }[]
  clinicName:          string
  clinicId:            string
  collectedSoFar:      Record<string, unknown>
  /** Pide también señales para el framework consultivo (needs/objeciones/estado emocional). */
  consultiveMode?:     boolean
}): Promise<QualificationResult> {
  const treatmentsList = Object.entries(TREATMENT_LABELS)
    .map(([k, v]) => `${k}: ${v}`)
    .join(', ')

  const consultiveFields = params.consultiveMode
    ? `,
  "detectedNeed": "<resume en pocas palabras la necesidad real del prospecto, ej. 'mejorar sonrisa para su boda', o null si no hay ninguna nueva>",
  "newObjection": "<resume en pocas palabras la objeción/duda real que plantea, ej. 'le parece caro', o null si no hay ninguna nueva>",
  "resolvedObjection": "<copia el texto EXACTO de una de las 'Objeciones sin resolver' abajo si este mensaje la resuelve, o null>",
  "emotionalState": "ansioso|curioso|escéptico|entusiasmado|neutro|frustrado"`
    : `,
  "detectedNeed": null, "newObjection": null, "resolvedObjection": null, "emotionalState": null`

  const objectionsContext = params.consultiveMode && Array.isArray((params.collectedSoFar as { objections?: { text: string; resolved: boolean }[] }).objections)
    ? `\nObjeciones sin resolver: ${((params.collectedSoFar as { objections: { text: string; resolved: boolean }[] }).objections)
        .filter(o => !o.resolved).map(o => `"${o.text}"`).join(', ') || 'ninguna'}`
    : ''

  const systemPrompt = `Analizador de mensajes para clínica dental "${params.clinicName}".
Extrae datos de calificación comercial del mensaje del prospecto.
TRATAMIENTOS: ${treatmentsList}${objectionsContext}
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
  "confidence": 0.9${consultiveFields}
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

  if (!result.success) return FALLBACK

  // El modelo a veces devuelve el string "null" en vez del valor JSON null
  // para los campos opcionales — sin esto, ese texto queda guardado tal cual
  // (ej. una objeción con el texto literal "null").
  return { ...result.data,
    treatment:         nullify(result.data.treatment),
    extractedName:     nullify(result.data.extractedName),
    extractedBudget:   nullify(result.data.extractedBudget),
    extractedBestTime: nullify(result.data.extractedBestTime),
    detectedNeed:      nullify(result.data.detectedNeed),
    newObjection:      nullify(result.data.newObjection),
    resolvedObjection: nullify(result.data.resolvedObjection),
  }
}

function nullify<T extends string>(value: T | null | undefined): T | null {
  if (!value) return null
  return value.trim().toLowerCase() === 'null' ? null : value
}
