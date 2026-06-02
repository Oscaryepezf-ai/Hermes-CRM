import { callAI } from '@/lib/ai/client'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import type { PatientToReactivate } from './segment-patients'

export async function generateReactivationMessage(params: {
  patient:       PatientToReactivate
  attemptNumber: number
  clinicId:      string
  clinicName:    string
  incentive?:    string
  tone:          'amigable' | 'formal'
}): Promise<string> {
  const firstName  = params.patient.fullName.split(' ')[0]
  const lastVisit  = params.patient.lastAppointmentDate
    ? format(params.patient.lastAppointmentDate, "d 'de' MMMM 'de' yyyy", { locale: es })
    : 'hace un tiempo'

  const incentiveContext = params.incentive
    ? `Tenemos una oferta especial: ${params.incentive}.`
    : ''

  const strategyByAttempt: Record<number, string> = {
    1: `Escribe un mensaje SUAVE y EMPÁTICO. Muestra interés genuino en su bienestar dental. NO seas vendedor. Termina con una pregunta simple como "¿Cómo estás?" o "¿Te gustaría programar una revisión?"`,
    2: `Escribe un mensaje de SEGUIMIENTO. El paciente no respondió antes. Menciona un beneficio concreto de hacer seguimiento dental. Sé más directo en invitar a agendar.`,
    3: `Escribe un ÚLTIMO intento. Sé cálido pero claro: es el último recordatorio. ${incentiveContext || 'Ofrece flexibilidad de horario.'} Deja la puerta abierta para cuando estén listos.`,
  }

  const result = await callAI({
    agentKey:     'CAPTADOR_RESPONDER',
    clinicId:     params.clinicId,
    systemPrompt: `Eres el asistente de comunicaciones de ${params.clinicName}.
Escribes mensajes de WhatsApp para reactivar pacientes inactivos.

REGLAS:
- Máximo 4 oraciones. Mensaje corto y directo.
- Tono: ${params.tone === 'amigable' ? 'cálido, cercano, como un amigo que se preocupa' : 'profesional y respetuoso'}.
- Español latinoamericano natural. Sin asteriscos ni listas.
- Usar el nombre del paciente al inicio.
- 1-2 emojis máximo. Ninguno si el tono es formal.
- NO menciones que llevan mucho tiempo sin ir.
- SÍ menciona el beneficio de volver o el tratamiento previo si es relevante.
- Termina siempre con una pregunta o llamada a la acción clara.
- NUNCA des precios. NUNCA diagnostiques.`,

    userPrompt: `Genera el mensaje para este paciente:

Nombre: ${firstName}
Última visita: ${lastVisit}
Días sin venir: ${params.patient.daysSinceLastAppt}
Tratamiento previo: ${params.patient.lastTreatment ?? 'no especificado'}
Visitas totales: ${params.patient.totalVisits}
Segmento: ${params.patient.segment}
Número de intento: ${params.attemptNumber} de ${params.patient.daysSinceLastAppt}
${incentiveContext}

Estrategia para este intento:
${strategyByAttempt[params.attemptNumber] ?? strategyByAttempt[1]}`,
  })

  if (!result.success) {
    return getFallbackMessage(firstName, params.clinicName, params.attemptNumber, params.incentive)
  }

  return result.data
}

function getFallbackMessage(
  name:          string,
  clinicName:    string,
  attemptNumber: number,
  incentive?:    string
): string {
  const templates: Record<number, string> = {
    1: `¡Hola ${name}! 😊 Te saludamos desde ${clinicName}. Queríamos preguntarte cómo estás y si te gustaría programar una revisión.`,
    2: `Hola ${name}, somos ${clinicName}. Queremos recordarte la importancia de mantener al día tus controles dentales. ¿Cuándo te queda bien una cita esta semana?`,
    3: `${name}, es nuestro último recordatorio por ahora. En ${clinicName} siempre tendremos un espacio para ti. ${incentive ? `Además tenemos ${incentive} especialmente para ti. ` : ''}¡Cuando estés listo/a, aquí estaremos! 🦷`,
  }
  return templates[attemptNumber] ?? templates[1]
}
