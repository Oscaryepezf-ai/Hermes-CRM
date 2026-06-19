import type { QualificationResult } from './qualification-engine'
import { callAI } from '@/lib/ai/client'

export type ResponseContext = {
  clinicId:      string
  clinicName:    string
  qualification: QualificationResult
  turnCount:     number
  collectedData: Record<string, unknown>
  channel:       string
  tone:          'formal' | 'amigable'
  patientName:   string | null
  specialties:   string[]
  businessHours: string
  maxTurns:      number
  knowledgeBase: string
}

function buildSystemPrompt(ctx: ResponseContext): string {
  const channelLabel =
    ctx.channel === 'WHATSAPP' ? 'WhatsApp' :
    ctx.channel === 'FACEBOOK' ? 'Facebook Messenger' : 'Instagram DM'

  return `Eres Hermes, el asistente virtual de ${ctx.clinicName}.
Eres ${ctx.tone === 'amigable' ? 'amigable, cálido y cercano' : 'profesional y cordial'}.
Escribes en español latinoamericano natural, como lo haría una recepcionista experta.

CANAL: ${channelLabel}
TRATAMIENTOS QUE OFRECEMOS: ${ctx.specialties.join(', ')}
HORARIO DE ATENCIÓN: ${ctx.businessHours}
TURNO ACTUAL: ${ctx.turnCount} de ${ctx.maxTurns}
${ctx.knowledgeBase ? `\nINFORMACIÓN DE LA CLÍNICA (úsala para responder dudas, nunca la inventes):\n${ctx.knowledgeBase}\n` : ''}

DATOS RECOPILADOS:
${JSON.stringify(ctx.collectedData, null, 2)}

INTENCIÓN: ${ctx.qualification.intent}
TRATAMIENTO: ${ctx.qualification.treatment ?? 'no detectado aún'}
URGENCIA: ${ctx.qualification.urgency}

REGLAS:
1. NUNCA des precios exactos — ofrece la valoración gratuita para más info
2. NUNCA diagnostiques — eres recepcionista, no doctor
3. Máximo 3 oraciones cortas. Sin listas ni asteriscos.
4. Si no sabes algo: "Te comunico con nuestra especialista 🙂"
5. Termina con UNA sola pregunta si falta info clave
6. Emojis con moderación: 1-2 por mensaje
7. Si ya tienes nombre + tratamiento + urgencia: invita a la cita de valoración
8. Si te preguntan si eres bot: "Soy el asistente virtual de ${ctx.clinicName} 😊"

PREGUNTAS (solo las que faltan):
- Nombre: "¿Con quién tengo el gusto?"
- Tratamiento: "¿En qué tratamiento estás interesado/a?"
- Urgencia: "¿Es algo urgente o puedes esperar unos días?"
- Horario: "¿Qué horario te queda mejor, mañanas o tardes?"

FLUJO IDEAL:
T1: Saluda + confirma interés + pide nombre
T2: Resuelve duda + confirma tratamiento
T3: Propone cita valoración + horario
T4: Confirma datos + dice que el equipo contactará pronto`
}

export async function generateCaptadorResponse(
  history: { role: 'user' | 'assistant'; content: string }[],
  ctx:     ResponseContext
): Promise<string> {
  const userPrompt = history.length > 0
    ? history.map(m => `${m.role === 'user' ? 'Prospecto' : 'Hermes'}: ${m.content}`).join('\n')
    : 'El prospecto acaba de escribir su primer mensaje.'

  const result = await callAI({
    agentKey:     'CAPTADOR_RESPONDER',
    clinicId:     ctx.clinicId,
    systemPrompt: buildSystemPrompt(ctx),
    userPrompt,
  })

  return result.success ? result.data.trim() : '¡Hola! Gracias por escribirnos. En breve te atendemos. 😊'
}

export function getHandoffMessage(clinicName: string, reason: string): string {
  const msgs: Record<string, string> = {
    urgencia:  `Entiendo que es urgente. Te conecto ahora con nuestra especialista. 🦷`,
    max_turns: `Gracias por tu paciencia. Un miembro del equipo de ${clinicName} se comunicará contigo en breve. 😊`,
    queja:     `Lamento lo sucedido. Te transfiero con nuestra coordinadora. 🙏`,
    solicitud: `Con gusto te conecto con alguien de nuestro equipo. Un momento.`,
  }
  return msgs[reason] ?? msgs.max_turns
}

export function getOutOfHoursMessage(clinicName: string, businessHours: string): string {
  const timeEC = new Date().toLocaleTimeString('es-EC', {
    timeZone: 'America/Guayaquil', hour: '2-digit', minute: '2-digit',
  })
  return `¡Hola! 👋 Gracias por escribirnos a ${clinicName}. Son las ${timeEC} y estamos fuera de horario.\n\nAtendemos ${businessHours}.\n\nTu mensaje quedó registrado y te contactaremos a primera hora. 😊`
}
