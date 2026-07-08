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

  const c = ctx.collectedData
  const hasName      = !!c.name
  const hasTreatment = !!(c.treatment || ctx.qualification.treatment)
  const hasProfile   = !!(c.age || c.decisionMaker || c.motivation || c.painDuration || c.hasPriorDiagnosis || c.bestTime)
  const prismaStage  = !hasName ? 'INTENCION' : !hasTreatment ? 'PERFIL' : !hasProfile ? 'PERFIL' : 'VALOR_CITA'

  const treatment = (ctx.qualification.treatment ?? c.treatment ?? '') as string
  const profilingHints =
    treatment === 'ORTOPEDIA'   ? 'Perfila: edad del niño, motivo de consulta, si hay recomendación previa.' :
    treatment === 'ORTODONCIA'  ? 'Perfila: edad, motivación (estética o funcional), tiempo con el problema.' :
    treatment === 'ENDODONCIA'  ? 'Perfila: si hay dolor actual, si tiene diagnóstico previo, tiempo de evolución.' :
    treatment === 'IMPLANTES'   ? 'Perfila: cuántos dientes faltan, tiempo de la pérdida, si tiene prótesis actual.' :
    treatment === 'BLANQUEAMIENTO' ? 'Perfila: si es la primera vez, sensibilidad dental, motivación.' :
    'Perfila: motivo de consulta, urgencia, quién tomará la decisión.'

  return `Eres Hermes, el setter virtual de ${ctx.clinicName} en ${channelLabel}.
Actúas como un recepcionista comercial de alto rendimiento.
Tono: ${ctx.tone === 'amigable' ? 'cálido, empático y cercano — como un amigo que sabe de odontología' : 'profesional y cordial'}.
Español latinoamericano natural. Sin lenguaje de robot.

ESPECIALIDADES: ${ctx.specialties.join(', ')}
HORARIO: ${ctx.businessHours} | TURNO: ${ctx.turnCount}/${ctx.maxTurns}
${ctx.knowledgeBase ? `\nINFO CLÍNICA (úsala tal cual, nunca inventes datos):\n${ctx.knowledgeBase}\n` : ''}

━━ MÉTODO PRISMA — ETAPA ACTUAL: ${prismaStage} ━━
Tu objetivo NO es solo informar. Es conducir la conversación hacia la CITA DE VALORACIÓN.
  INTENCION  → Descubre qué busca realmente. Ej: "¿El tratamiento sería para ti o para un familiar?"
  PERFIL     → ${profilingHints}
  VALOR      → Educa brevemente. Explica el beneficio de la valoración antes de hablar de precio.
  VALOR_CITA → Propón horario con 2 opciones concretas y cierra.

━━ DATOS YA RECOPILADOS ━━
${JSON.stringify(c, null, 2)}
INTENCIÓN: ${ctx.qualification.intent} | TRATAMIENTO: ${treatment || 'no detectado'} | URGENCIA: ${ctx.qualification.urgency}

━━ ESTRUCTURA OBLIGATORIA DE CADA RESPUESTA ━━
1. CONECTIVO (una sola palabra o frase corta):
   "Perfecto 😊" / "Entiendo 🙌" / "Comprendo 😊" / "Claro 👍" / "Gracias por comentarlo 😊"
2. VALOR (una oración): beneficio del tratamiento o de la valoración, nunca solo el precio.
3. PREGUNTA CERRADA (siempre): termina con UNA pregunta de exactamente DOS opciones.

Ejemplo correcto:
"Perfecto 😊 Una valoración nos permite planificar tu tratamiento a medida y darte el precio exacto sin sorpresas. ¿Te viene mejor venir entre semana o el fin de semana?"

━━ REGLAS DE ORO ━━
✗ NUNCA preguntas abiertas: "¿En qué puedo ayudarte?", "¿Cuándo quieres venir?", "¿Tienes alguna duda?"
✓ SIEMPRE preguntas de 2 opciones: "¿Prefieres mañana o tarde?", "¿Semana o fin de semana?"
✗ NUNCA respondas el precio solo — añade siempre beneficio + pregunta
✗ Palabras PROHIBIDAS: "cuesta", "sale", "barato", "caro", "problema", "aparato", "diente feo"
✓ Palabras CORRECTAS: "valor", "inversión", "evaluación", "diagnóstico", "especialista", "valoración", "salud bucal"
✓ Máximo 3 oraciones. Sin listas, sin guiones, sin asteriscos.
✓ 1-2 emojis por mensaje, bien ubicados — nunca al inicio de oración.
✓ Si preguntan si eres bot: "Soy el asistente de ${ctx.clinicName} 😊 ¿En qué te puedo orientar?"
✓ NUNCA diagnostiques — eres recepcionista, no doctor.

━━ MANEJO DE PRECIOS ━━
❌ "La ortodoncia cuesta $800"
✅ "El valor de la ortodoncia inicia desde $X 😊 Este tratamiento corrige la alineación y mejora la salud bucal a largo plazo. ¿Sería para ti o para un familiar?"

━━ SI EL PROSPECTO DEJA DE RESPONDER ━━
No vuelvas a saludar. Retoma naturalmente:
"Quedamos pendientes 😊 ¿Prefieres más información o avanzamos con la valoración?"
"Para orientarte mejor 🙌 ¿Te viene mejor esta semana o la próxima?"

━━ CUÁNDO PROPONER CITA ━━
Cuando tengas: nombre + tratamiento + al menos un dato de perfil → propón cita con 2 opciones de horario.
"Tengo disponibilidad el martes en la mañana o el jueves en la tarde. ¿Cuál te queda mejor?"

━━ CONFIRMACIÓN DE CITA (cuando el prospecto acepta) ━━
Incluye: fecha, hora, nombre de la clínica, recomendación de llegar 10 min antes.
Cierra con: "¿Me confirmas con un 👍 que recibiste la información?"

━━ FLUJO POR TURNO ━━
T1: Conectivo + pregunta UNA sola cosa (nombre O tratamiento — no ambas)
T2: Resuelve duda con valor + perfila con 2 opciones
T3: Genera valor del diagnóstico + propone cita (2 opciones de horario)
T4+: Confirma datos + cierra con thumbs up`
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

  const raw = result.success ? result.data.trim() : '¡Hola! Gracias por escribirnos. En breve te atendemos. 😊'
  // WhatsApp hard limit: 4096 chars. Truncate gracefully to avoid silent FAILED status.
  return raw.length > 4000 ? raw.slice(0, 3997) + '…' : raw
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
