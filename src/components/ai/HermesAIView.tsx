"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Brain, Sparkles } from "lucide-react";
import {
  MessageSquareMore,
  CalendarClock,
  RefreshCw,
  BarChart2,
} from "lucide-react";
import { AgentBubble } from "./AgentBubble";
import { AgentDetailPanel } from "./AgentDetailPanel";
import type { AgentConfig } from "./AgentBubble";

const AGENTS: AgentConfig[] = [
  {
    id: "captador",
    name: "Hermes Captador",
    tagline: "Captura leads 24/7",
    description:
      "Responde consultas de WhatsApp e Instagram de forma automática, califica el interés del prospecto y lo registra directamente en tu pipeline sin que tengas que mover un dedo.",
    icon: MessageSquareMore,
    gradient: "bg-gradient-to-br from-indigo-500 to-violet-600",
    accentColor: "text-indigo-600",
    borderColor: "border-indigo-400",
    status: "active",
    stats: [
      { label: "Leads captados", value: "147" },
      { label: "Tasa respuesta", value: "94%" },
    ],
    ctaLabel: "Configurar Captador",
  },
  {
    id: "agendador",
    name: "Hermes Agendador",
    tagline: "Agenda sin fricción",
    description:
      "Coordina citas en tiempo real consultando tu calendario, envía confirmaciones automáticas y recuerda a los pacientes 24 horas antes. Reduce las ausencias hasta un 60%.",
    icon: CalendarClock,
    gradient: "bg-gradient-to-br from-teal-500 to-cyan-600",
    accentColor: "text-teal-600",
    borderColor: "border-teal-400",
    status: "active",
    stats: [
      { label: "Citas agendadas", value: "83" },
      { label: "Ausentismo", value: "-58%" },
    ],
    ctaLabel: "Configurar Agendador",
  },
  {
    id: "reactivador",
    name: "Hermes Reactivador",
    tagline: "Recupera pacientes perdidos",
    description:
      "Identifica pacientes que llevan más de 90 días sin cita y les envía mensajes personalizados con incentivos. Recupera ingresos que creías perdidos de forma completamente automatizada.",
    icon: RefreshCw,
    gradient: "bg-gradient-to-br from-amber-500 to-orange-500",
    accentColor: "text-amber-600",
    borderColor: "border-amber-400",
    status: "beta",
    stats: [
      { label: "Reactivados", value: "31" },
      { label: "Ingreso extra", value: "$4.2M" },
    ],
    ctaLabel: "Activar Beta",
  },
  {
    id: "analitico",
    name: "Hermes Analítico",
    tagline: "Inteligencia de negocio",
    description:
      "Analiza tu pipeline semana a semana, detecta cuellos de botella, proyecta ingresos con IA predictiva y te envía un reporte accionable cada lunes a las 8 AM.",
    icon: BarChart2,
    gradient: "bg-gradient-to-br from-violet-500 to-pink-600",
    accentColor: "text-violet-600",
    borderColor: "border-violet-400",
    status: "coming_soon",
    ctaLabel: "Notificarme",
  },
];

export function HermesAIView() {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selectedAgent = AGENTS.find((a) => a.id === selectedId) ?? null;

  const handleSelect = (id: string) => {
    setSelectedId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center flex-shrink-0 shadow-md">
          <Brain className="w-6 h-6 text-white" strokeWidth={1.5} />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">Hermes AI</h1>
            <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
              <Sparkles className="w-2.5 h-2.5" />
              Pro
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">
            Agentes inteligentes que trabajan por tu clínica mientras tú te enfocas en tus pacientes.
          </p>
        </div>
      </div>

      {/* Grid de agentes + panel de detalle */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bubbles — ocupan 2/3 en desktop */}
        <div className="lg:col-span-2 grid grid-cols-2 gap-4 auto-rows-fr">
          {AGENTS.map((agent) => (
            <AgentBubble
              key={agent.id}
              agent={agent}
              isSelected={selectedId === agent.id}
              onSelect={handleSelect}
            />
          ))}
        </div>

        {/* Panel de detalle — 1/3 derecho */}
        <div className="lg:col-span-1">
          <AnimatePresence mode="wait">
            {selectedAgent ? (
              <motion.div
                key={selectedAgent.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 12 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
              >
                <AgentDetailPanel
                  agent={selectedAgent}
                  onClose={() => setSelectedId(null)}
                />
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center h-full min-h-[320px] rounded-2xl border border-dashed border-medical-border text-center p-8"
              >
                <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                  <Brain className="w-7 h-7 text-slate-300" strokeWidth={1.5} />
                </div>
                <p className="text-sm font-medium text-gray-400">
                  Selecciona un agente para ver sus capacidades
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Footer note */}
      <p className="text-xs text-gray-400 text-center">
        Los agentes se conectan a tu número de WhatsApp Business vía API oficial de Meta. Requiere plan Profesional o superior.
      </p>
    </div>
  );
}
