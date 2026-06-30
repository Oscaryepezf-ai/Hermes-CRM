"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Send, RotateCcw, Bot, User, Loader2, AlertTriangle, CheckCircle2, Calendar, BadgeCheck, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"

type Message = {
  role:    "user" | "bot"
  content: string
  ts:      number
}

type SimStatus = {
  stageName:    string | null
  journeyState: string | null
  intent:       string | null
  treatment:    string | null
  urgency:      string | null
  handed_off:   boolean
  turnsLeft:    number | null
}

const JOURNEY_LABEL: Record<string, string> = {
  PROSPECTO:      "Prospecto",
  CALIFICADO:     "Calificado",
  CITA_AGENDADA:  "Cita agendada",
  EN_CONSULTA:    "En consulta",
  PACIENTE_ACTIVO: "Paciente activo",
  INACTIVO:       "Inactivo",
  PERDIDO:        "Perdido",
}

const INTENT_LABEL: Record<string, string> = {
  consulta_precio:      "Consulta de precio",
  agendar_cita:         "Quiere agendar cita",
  informacion_general:  "Información general",
  urgencia_dental:      "Urgencia dental",
  seguimiento:          "Seguimiento",
  queja_o_problema:     "Queja / problema",
  fuera_de_contexto:    "Fuera de contexto",
  saludo_inicial:       "Saludo inicial",
}

export function SimulatorChat() {
  const [sessionId]  = useState(() => crypto.randomUUID())
  const [messages,  setMessages]  = useState<Message[]>([])
  const [input,     setInput]     = useState("")
  const [loading,   setLoading]   = useState(false)
  const [status,    setStatus]    = useState<SimStatus>({
    stageName: null, journeyState: null, intent: null,
    treatment: null, urgency: null, handed_off: false, turnsLeft: null,
  })
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLInputElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, loading])

  const send = useCallback(async () => {
    const text = input.trim()
    if (!text || loading || status.handed_off) return

    setMessages(prev => [...prev, { role: "user", content: text, ts: Date.now() }])
    setInput("")
    setLoading(true)

    try {
      const res = await fetch("/api/simulate/message", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ message: text, sessionId }),
      })
      const data = await res.json()
      if (data.error) {
        setMessages(prev => [...prev, { role: "bot", content: `⚠️ Error: ${data.error}`, ts: Date.now() }])
      } else {
        setMessages(prev => [...prev, { role: "bot", content: data.reply, ts: Date.now() }])
        setStatus({
          stageName:    data.stageName,
          journeyState: data.journeyState,
          intent:       data.qualification?.intent ?? null,
          treatment:    data.qualification?.treatment ?? null,
          urgency:      data.qualification?.urgency ?? null,
          handed_off:   data.handed_off ?? false,
          turnsLeft:    data.turnsLeft ?? null,
        })
      }
    } catch {
      setMessages(prev => [...prev, { role: "bot", content: "⚠️ Error de red. Intenta de nuevo.", ts: Date.now() }])
    } finally {
      setLoading(false)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [input, loading, sessionId, status.handed_off])

  const reset = useCallback(async () => {
    await fetch("/api/simulate/reset", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body:   JSON.stringify({ sessionId }),
    })
    setMessages([])
    setInput("")
    setStatus({ stageName: null, journeyState: null, intent: null, treatment: null, urgency: null, handed_off: false, turnsLeft: null })
    setTimeout(() => inputRef.current?.focus(), 100)
  }, [sessionId])

  return (
    <div className="flex gap-4 h-[calc(100vh-160px)] min-h-[500px]">

      {/* LEFT: Chat panel */}
      <div className="flex-1 flex flex-col bg-surface border border-line-subtle rounded-[12px] shadow-card overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-line-subtle bg-[#128C7E] text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[13px] font-semibold">Hermes IA</p>
              <p className="text-[10px] opacity-70">Simulador de conversación</p>
            </div>
          </div>
          <button
            type="button"
            onClick={reset}
            title="Reiniciar simulación"
            className="flex items-center gap-1.5 text-[11px] bg-white/10 hover:bg-white/20 px-2.5 py-1.5 rounded-lg transition-ui"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reiniciar
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-[#ECE5DD] dark:bg-[#1a1a2e]">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full gap-2 text-ink-tertiary">
              <Bot className="w-10 h-10 opacity-30" />
              <p className="text-[13px]">Escribe un mensaje para iniciar la simulación</p>
              <p className="text-[11px] opacity-70">Usa frases como "quiero información sobre ortodoncia" o "me duele una muela"</p>
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
              {m.role === "bot" && (
                <div className="w-6 h-6 rounded-full bg-[#128C7E] flex items-center justify-center mr-1.5 flex-shrink-0 mt-0.5">
                  <Bot className="w-3.5 h-3.5 text-white" />
                </div>
              )}
              <div className={cn(
                "max-w-[75%] px-3 py-2 rounded-xl text-[13px] shadow-sm",
                m.role === "user"
                  ? "bg-[#DCF8C6] dark:bg-[#055C4E] text-ink-primary rounded-tr-none"
                  : "bg-white dark:bg-[#2a2a3e] text-ink-primary rounded-tl-none"
              )}>
                <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
                <p className="text-[10px] text-ink-disabled text-right mt-1">
                  {new Date(m.ts).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              {m.role === "user" && (
                <div className="w-6 h-6 rounded-full bg-brand-200 flex items-center justify-center ml-1.5 flex-shrink-0 mt-0.5">
                  <User className="w-3.5 h-3.5 text-brand-700" />
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex justify-start items-center gap-1.5">
              <div className="w-6 h-6 rounded-full bg-[#128C7E] flex items-center justify-center flex-shrink-0">
                <Bot className="w-3.5 h-3.5 text-white" />
              </div>
              <div className="bg-white dark:bg-[#2a2a3e] px-3 py-2 rounded-xl rounded-tl-none shadow-sm flex items-center gap-1.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-ink-tertiary" />
                <span className="text-[12px] text-ink-tertiary">Hermes está escribiendo…</span>
              </div>
            </div>
          )}

          {status.handed_off && !loading && (
            <div className="flex justify-center">
              <span className="text-[11px] text-ink-tertiary bg-white/60 dark:bg-white/10 px-3 py-1 rounded-full">
                Conversación transferida a un humano
              </span>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="px-3 py-2.5 border-t border-line-subtle flex items-center gap-2 bg-surface">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send() } }}
            placeholder={status.handed_off ? "Reinicia la simulación para continuar" : "Escribe como si fueras el prospecto…"}
            disabled={status.handed_off || loading}
            className="flex-1 h-9 rounded-full border border-line-subtle bg-transparent px-4 text-[13px] text-ink-primary outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 disabled:opacity-40"
            autoFocus
          />
          <button
            type="button"
            onClick={send}
            disabled={!input.trim() || loading || status.handed_off}
            className="w-9 h-9 rounded-full bg-[#128C7E] text-white flex items-center justify-center hover:bg-[#0e7266] transition-ui disabled:opacity-40"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* RIGHT: Status panel */}
      <div className="w-[280px] flex-shrink-0 space-y-3">
        {/* Pipeline stage */}
        <div className="bg-surface border border-line-subtle rounded-[12px] shadow-card p-4">
          <p className="text-[11px] font-semibold text-ink-tertiary uppercase tracking-wide mb-3">Estado del Pipeline</p>
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[12px] text-ink-secondary">Etapa</span>
              <span className={cn(
                "text-[12px] font-semibold px-2 py-0.5 rounded-full",
                status.stageName ? "bg-brand-50 text-brand-600" : "bg-inset text-ink-disabled"
              )}>
                {status.stageName ?? "—"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[12px] text-ink-secondary">Journey</span>
              <span className="text-[12px] font-medium text-ink-primary">
                {status.journeyState ? JOURNEY_LABEL[status.journeyState] ?? status.journeyState : "—"}
              </span>
            </div>
          </div>
        </div>

        {/* AI qualification */}
        <div className="bg-surface border border-line-subtle rounded-[12px] shadow-card p-4">
          <p className="text-[11px] font-semibold text-ink-tertiary uppercase tracking-wide mb-3">Calificación de la IA</p>
          <div className="space-y-2.5">
            <div className="flex items-start justify-between gap-2">
              <span className="text-[12px] text-ink-secondary flex-shrink-0">Intención</span>
              <span className="text-[12px] font-medium text-ink-primary text-right">
                {status.intent ? (INTENT_LABEL[status.intent] ?? status.intent) : "—"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[12px] text-ink-secondary">Tratamiento</span>
              <span className="text-[12px] font-medium text-ink-primary">
                {status.treatment ?? "—"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[12px] text-ink-secondary">Urgencia</span>
              <span className={cn(
                "text-[12px] font-semibold px-2 py-0.5 rounded-full",
                status.urgency === "alta"  ? "bg-red-50 text-red-600" :
                status.urgency === "media" ? "bg-amber-50 text-amber-600" :
                status.urgency === "baja"  ? "bg-green-50 text-green-600" :
                "text-ink-disabled"
              )}>
                {status.urgency ?? "—"}
              </span>
            </div>
          </div>
        </div>

        {/* Turno info */}
        {status.turnsLeft !== null && (
          <div className="bg-surface border border-line-subtle rounded-[12px] shadow-card p-4">
            <p className="text-[11px] font-semibold text-ink-tertiary uppercase tracking-wide mb-2">Turnos restantes</p>
            <p className={cn("text-[22px] font-bold", status.turnsLeft <= 1 ? "text-red-500" : "text-ink-primary")}>
              {status.turnsLeft}
            </p>
            <p className="text-[11px] text-ink-tertiary">Después hará handoff al humano</p>
          </div>
        )}

        {/* Handoff badge */}
        {status.handed_off && (
          <div className="bg-amber-50 border border-amber-200 rounded-[12px] p-4 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-[12px] font-semibold text-amber-800">Transferido a humano</p>
              <p className="text-[11px] text-amber-700 mt-0.5">El agente detectó que este lead necesita atención humana. Presiona "Reiniciar" para una nueva prueba.</p>
            </div>
          </div>
        )}

        {/* Tips */}
        <div className="bg-surface border border-line-subtle rounded-[12px] shadow-card p-4">
          <div className="flex items-center gap-1.5 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-violet-500" />
            <p className="text-[11px] font-semibold text-ink-tertiary uppercase tracking-wide">Mensajes de prueba</p>
          </div>
          <div className="space-y-1.5">
            {[
              "Hola, me interesa la ortodoncia",
              "¿Cuánto cuesta un implante?",
              "Quiero agendar una cita",
              "Me duele mucho una muela urgente",
              "¿Tienen financiamiento?",
            ].map((tip) => (
              <button
                key={tip}
                type="button"
                onClick={() => { setInput(tip); inputRef.current?.focus() }}
                disabled={status.handed_off || loading}
                className="w-full text-left text-[11px] text-brand-600 hover:text-brand-700 bg-brand-50 hover:bg-brand-100 px-2.5 py-1.5 rounded-lg transition-ui disabled:opacity-40 truncate"
              >
                {tip}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
