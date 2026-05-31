import OpenAI from 'openai'
import type { DentalTreatment } from '@prisma/client'
import { TREATMENT_LABELS } from '@/types/leads'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

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
  intent:             LeadIntent
  treatment:          DentalTreatment | null
  urgency:            'alta' | 'media' | 'baja'
  sentiment:          'positivo' | 'neutro' | 'negativo'
  extractedName:      string | null
  extractedBudget:    string | null
  extractedBestTime:  string | null
  shouldRespond:      boolean
  shouldHandOff:      boolean
  confidence:         number
}

export async function qualifyMessage(params: {
  message:             string
  conversationHistory: { role: 'user' | 'assistant'; content: string }[]
  clinicName:          string
  collectedSoFar:      Record<string, unknown>
}): Promise<QualificationResult> {
  const treatmentsList = Object.entries(TREATMENT_LABELS)
    .map(([k, v]) => `${k}: ${v}`)
    .join(', ')

  try {
    const res = await openai.chat.completions.create({
      model:           'gpt-4o-mini',
      response_format: { type: 'json_object' },
      temperature:     0.1,
      max_tokens:      400,
      messages: [
        {
          role: 'system',
          content: `Analizador de mensajes para clínica dental "${params.clinicName}".
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
shouldRespond=false SOLO si: fuera_de_contexto irrelevante.`,
        },
        ...params.conversationHistory.slice(-6),
        { role: 'user', content: params.message },
      ],
    })

    const raw = res.choices[0].message.content ?? '{}'
    return JSON.parse(raw) as QualificationResult
  } catch {
    return {
      intent:            'saludo_inicial',
      treatment:         null,
      urgency:           'media',
      sentiment:         'neutro',
      extractedName:     null,
      extractedBudget:   null,
      extractedBestTime: null,
      shouldRespond:     true,
      shouldHandOff:     false,
      confidence:        0.5,
    }
  }
}
