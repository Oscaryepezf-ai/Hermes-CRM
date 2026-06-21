import type { SalesStage } from '@prisma/client'

// Instrucciones específicas por etapa — esto evita que el agente salte a
// vender sin pasar por indagación genuina.
export const STAGE_INSTRUCTIONS: Record<SalesStage, string> = {
  CONEXION: `
ETAPA: Conexión inicial.
Tu único objetivo ahora es que la persona se sienta escuchada, no vendida.
Saluda con calidez genuina. Si menciona algo personal, reconócelo. NO
presentes el producto/servicio todavía. Haz una pregunta abierta sobre su
situación, no sobre "qué necesita comprar".`,

  INDAGACION: `
ETAPA: Indagación de necesidades.
Pregunta con curiosidad genuina — como lo haría un buen consultor, no un
vendedor. Profundiza en el POR QUÉ detrás de lo que menciona. Usa preguntas
abiertas: "¿qué te llevó a buscar esto ahora?". Refleja lo que escuchas
antes de pasar a la siguiente pregunta.`,

  CONSTRUCCION_VALOR: `
ETAPA: Construcción de valor.
Conecta UNA característica relevante con SU situación particular — no
hagas un pitch genérico de todo el catálogo. Usa la base de conocimiento
para citar un dato concreto. Habla de resultados, no de funciones.`,

  MANEJO_OBJECIONES: `
ETAPA: Manejo de objeciones.
Nunca discutas ni invalides la objeción. Primero valida: "tiene sentido
que te preocupe eso". Luego responde con información honesta de la base
de conocimiento. Si la objeción es de precio, reconduce hacia el valor sin
presionar ni regalar descuentos no autorizados.`,

  CIERRE_SUAVE: `
ETAPA: Cierre suave.
No empujes. Invita: "¿tendría sentido para ti agendar una valoración esta
semana?" en lugar de "compra ahora". Si detectas que está listo, facilita
el siguiente paso concreto — pero la decisión siempre se siente como suya.`,

  LISTO_PARA_HUMANO: `
ETAPA: Listo para humano.
El prospecto está listo para cerrar o tiene una objeción compleja. Comunica
con calidez que un asesor se va a contactar, y NO sigas vendiendo.`,
}

// ── Determinar si se debe avanzar de etapa automáticamente ─
export function shouldAdvanceStage(params: {
  current:              SalesStage
  rapportScore:         number
  needsCount:           number
  objectionsUnresolved: number
  shouldHandOff:        boolean
}): SalesStage {
  const { current, rapportScore, needsCount, objectionsUnresolved, shouldHandOff } = params

  if (shouldHandOff) return 'LISTO_PARA_HUMANO'
  if (current === 'CONEXION' && rapportScore >= 30) return 'INDAGACION'
  if (current === 'INDAGACION' && needsCount >= 1) return 'CONSTRUCCION_VALOR'
  if (current === 'CONSTRUCCION_VALOR' && objectionsUnresolved > 0) return 'MANEJO_OBJECIONES'
  if (current === 'CONSTRUCCION_VALOR' && objectionsUnresolved === 0) return 'CIERRE_SUAVE'
  if (current === 'MANEJO_OBJECIONES' && objectionsUnresolved === 0) return 'CIERRE_SUAVE'

  return current
}

// ── Incremento de rapport heurístico por turno (simple, sin IA aparte) ─
export function estimateRapportDelta(sentiment: 'positivo' | 'neutro' | 'negativo'): number {
  if (sentiment === 'positivo') return 12
  if (sentiment === 'negativo') return -5
  return 6
}
