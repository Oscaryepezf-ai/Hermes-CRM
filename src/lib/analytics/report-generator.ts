import OpenAI from "openai";
import type { ClinicMetrics } from "./pipeline-metrics";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export type GeneratedReport = {
  headline: string;
  executiveSummary: string;
  insights: {
    title: string;
    description: string;
    priority: "alta" | "media" | "baja";
    type: "problema" | "oportunidad" | "logro";
    action: string;
  }[];
  bottleneck: {
    stage: string;
    reason: string;
    suggestion: string;
  } | null;
  revenueProjection: {
    thisMonth: number;
    nextMonth: number;
    trend: "subiendo" | "estable" | "bajando";
    commentary: string;
  };
  topPriority: string;
  motivationalClose: string;
};

export async function generateAnalyticsReport(
  metrics: ClinicMetrics
): Promise<GeneratedReport> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const prompt = buildPrompt(metrics);

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    response_format: { type: "json_object" },
    temperature: 0.4,
    max_tokens: 2000,
    messages: [
      {
        role: "system",
        content: `Eres Hermes Analítico, el agente de inteligencia de negocio de Hermes CRM Dental.
Tu función es analizar los datos del pipeline de una clínica odontológica y generar un reporte ejecutivo semanal accionable.

TONO: Directo, profesional, empático con el odontólogo-empresario. Habla como un socio de negocios experimentado, no como un sistema de reportes frío.
IDIOMA: Español latinoamericano, tuteando al doctor.

REGLAS:
- Cada insight debe tener una acción concreta y específica (no genérica)
- Detecta el cuello de botella más crítico del pipeline con precisión
- La proyección de ingresos debe ser honesta — si los números son malos, dilo con respeto
- topPriority debe ser UNA sola cosa, la más impactante de la semana
- El cierre motivacional debe ser auténtico, no corporativo

FORMATO: JSON exacto con la siguiente estructura (sin texto fuera del JSON):
{
  "headline": "string",
  "executiveSummary": "string",
  "insights": [{ "title": "string", "description": "string", "priority": "alta|media|baja", "type": "problema|oportunidad|logro", "action": "string" }],
  "bottleneck": { "stage": "string", "reason": "string", "suggestion": "string" } | null,
  "revenueProjection": { "thisMonth": number, "nextMonth": number, "trend": "subiendo|estable|bajando", "commentary": "string" },
  "topPriority": "string",
  "motivationalClose": "string"
}`,
      },
      { role: "user", content: prompt },
    ],
  });

  const raw = response.choices[0].message.content ?? "{}";
  return JSON.parse(raw) as GeneratedReport;
}

function buildPrompt(m: ClinicMetrics): string {
  const weekLabel = `${format(m.period.weekStart, "d 'de' MMMM", { locale: es })} al ${format(m.period.weekEnd, "d 'de' MMMM yyyy", { locale: es })}`;

  return `Analiza los siguientes datos de **${m.clinic.name}** para la semana del ${weekLabel}:

## PIPELINE
- Total leads activos: ${m.pipeline.totalLeads}
- Nuevos esta semana: ${m.pipeline.newLeadsThisWeek} (semana anterior: ${m.pipeline.newLeadsLastWeek})
- Tasa de conversión (30 días): ${m.pipeline.conversionRate}%
- Días promedio para convertir: ${m.pipeline.avgDaysToConvert}

## DISTRIBUCIÓN POR ETAPA
${m.pipeline.leadsByStage.map((s) => `- ${s.stage}: ${s.count} leads, promedio ${s.avgDaysInStage} días en esa etapa`).join("\n")}

## LEADS ATASCADOS (+7 días sin movimiento)
${
  m.pipeline.stuckLeads.length === 0
    ? "- Ninguno"
    : m.pipeline.stuckLeads
        .map((l) => `- ${l.fullName} | ${l.stage} | ${l.daysStuck} días | ${l.treatment}`)
        .join("\n")
}

## CITAS ESTA SEMANA
- Total: ${m.appointments.scheduledThisWeek}
- Completadas: ${m.appointments.completedThisWeek}
- Canceladas: ${m.appointments.cancelledThisWeek}
- No asistió: ${m.appointments.noShowThisWeek}
- Tasa de asistencia: ${m.appointments.attendanceRate}%

## INGRESOS
- Confirmados este mes: $${m.revenue.confirmedThisMonth.toLocaleString()} USD
- Proyectados (leads activos): $${m.revenue.projectedThisMonth.toLocaleString()} USD
- Proyección próximo mes: $${m.revenue.projectedNextMonth.toLocaleString()} USD

## FUENTES DE LEADS
${m.pipeline.leadsBySource.map((s) => `- ${s.source}: ${s.count} leads, ${s.conversionRate}% conversión`).join("\n")}

## ALERTAS DETECTADAS
${
  m.alerts.length === 0
    ? "- Sin alertas críticas"
    : m.alerts.map((a) => `- [${a.type.toUpperCase()}] ${a.message}`).join("\n")
}

Para revenueProjection.thisMonth usa ${m.revenue.projectedThisMonth}, para nextMonth usa ${m.revenue.projectedNextMonth}.
Genera el reporte ejecutivo en el JSON solicitado.`;
}
