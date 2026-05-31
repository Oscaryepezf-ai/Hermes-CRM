"use client";

import Link from "next/link";
import { Bot, Zap, Clock, CheckCircle2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AgentConfig } from "./AgentBubble";

interface AgentDetailPanelProps {
  agent: AgentConfig;
  onClose: () => void;
}

const CAPABILITIES: Record<string, string[]> = {
  captador: [
    "Responde consultas por WhatsApp en menos de 1 minuto",
    "Califica leads con preguntas guiadas automáticamente",
    "Crea el lead en el pipeline sin intervención humana",
    "Detecta intención de compra y prioriza según urgencia",
    "Soporte 24/7 incluso fuera del horario de la clínica",
  ],
  agendador: [
    "Propone horarios disponibles según el calendario real",
    "Confirma citas con recordatorio 24h antes por WhatsApp",
    "Reagenda automáticamente si el paciente cancela",
    "Sincroniza con Google Calendar del odontólogo",
    "Envía indicaciones de preparación antes de la cita",
  ],
  reactivador: [
    "Identifica pacientes sin cita en los últimos 90 días",
    "Envía campañas personalizadas con promociones activas",
    "Segmenta por tipo de tratamiento previo",
    "Mide tasa de respuesta y ajusta el mensaje automáticamente",
    "Genera reporte de pacientes recuperados por mes",
  ],
  analitico: [
    "Dashboard semanal automático por correo cada lunes",
    "Detecta cuellos de botella en tu pipeline en tiempo real",
    "Proyecta ingresos del próximo mes con IA predictiva",
    "Compara tu rendimiento con clínicas similares (benchmark)",
    "Sugiere acciones concretas para mejorar conversión",
  ],
};

export function AgentDetailPanel({ agent, onClose }: AgentDetailPanelProps) {
  const Icon = agent.icon;
  const caps = CAPABILITIES[agent.id] ?? [];

  return (
    <div className="bg-medical-card rounded-2xl border border-medical-border shadow-sm overflow-hidden">
      {/* Header */}
      <div className={cn("relative px-6 py-5", agent.gradient)}>
        <button
          onClick={onClose}
          aria-label="Cerrar panel"
          className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <Icon className="w-7 h-7 text-white" strokeWidth={1.5} />
          </div>
          <div>
            <h2 className="text-white font-bold text-lg leading-tight">{agent.name}</h2>
            <p className="text-white/80 text-sm">{agent.tagline}</p>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="p-6 space-y-5">
        {/* Description */}
        <p className="text-sm text-gray-600 leading-relaxed">{agent.description}</p>

        {/* Capabilities */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-4 h-4 text-amber-500" />
            <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wide">
              Capacidades
            </h4>
          </div>
          <ul className="space-y-2">
            {caps.map((cap, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm text-gray-600">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                {cap}
              </li>
            ))}
          </ul>
        </div>

        {/* Stats if available */}
        {agent.stats && (
          <div className="grid grid-cols-2 gap-3">
            {agent.stats.map((stat) => (
              <div
                key={stat.label}
                className="bg-slate-50 rounded-xl px-4 py-3 text-center border border-medical-border"
              >
                <p className={cn("text-2xl font-bold", agent.accentColor)}>
                  {stat.value}
                </p>
                <p className="text-[11px] text-gray-400 mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* CTA or coming soon */}
        {agent.status === "coming_soon" ? (
          <div className="flex items-center gap-2.5 bg-slate-50 rounded-xl px-4 py-3 border border-medical-border">
            <Clock className="w-4 h-4 text-slate-400" />
            <p className="text-sm text-slate-500">
              Este agente estará disponible próximamente. Te notificaremos cuando esté listo.
            </p>
          </div>
        ) : agent.href ? (
          <Link
            href={agent.href}
            className={cn(
              "flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90",
              agent.gradient
            )}
          >
            <Bot className="w-4 h-4" />
            {agent.ctaLabel}
          </Link>
        ) : (
          <button
            className={cn(
              "w-full py-3 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90",
              agent.gradient
            )}
          >
            <div className="flex items-center justify-center gap-2">
              <Bot className="w-4 h-4" />
              {agent.ctaLabel}
            </div>
          </button>
        )}
      </div>
    </div>
  );
}
