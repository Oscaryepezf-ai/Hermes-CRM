import type { ClinicMetrics } from "./pipeline-metrics";
import type { GeneratedReport } from "./report-generator";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const C = {
  primary: "#6366F1",
  success: "#10B981",
  warning: "#F59E0B",
  danger: "#EF4444",
  bg: "#F8FAFC",
  card: "#FFFFFF",
  text: "#1E293B",
  muted: "#64748B",
  border: "#E2E8F0",
};

function metricBox(value: string, label: string, color: string): string {
  return `<td style="width:50%;padding:8px">
    <div style="background:${C.bg};border-radius:12px;padding:16px;text-align:center;border:1px solid ${C.border}">
      <div style="font-size:28px;font-weight:700;color:${color};margin-bottom:4px">${value}</div>
      <div style="font-size:12px;color:${C.muted}">${label}</div>
    </div>
  </td>`;
}

function priorityBadge(p: string): string {
  const map: Record<string, [string, string]> = {
    alta: ["#FEE2E2", "#991B1B"],
    media: ["#FEF3C7", "#92400E"],
    baja: ["#F0FDF4", "#166534"],
  };
  const [bg, text] = map[p] ?? map.baja;
  return `<span style="background:${bg};color:${text};font-size:11px;padding:2px 8px;border-radius:20px;font-weight:500">${p.toUpperCase()}</span>`;
}

function typeBadge(t: string): string {
  const map: Record<string, [string, string]> = {
    problema: ["#FEE2E2", "#991B1B"],
    oportunidad: ["#DBEAFE", "#1E40AF"],
    logro: ["#D1FAE5", "#065F46"],
  };
  const [bg, text] = map[t] ?? ["#F1F5F9", "#475569"];
  return `<span style="background:${bg};color:${text};font-size:11px;padding:2px 8px;border-radius:20px;font-weight:500">${t}</span>`;
}

export function buildReportEmailHTML(
  metrics: ClinicMetrics,
  report: GeneratedReport
): string {
  const weekLabel = `${format(metrics.period.weekStart, "d 'de' MMMM", { locale: es })} — ${format(metrics.period.weekEnd, "d 'de' MMMM yyyy", { locale: es })}`;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://hermescrm.app";

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Reporte Semanal — ${metrics.clinic.name}</title>
</head>
<body style="margin:0;padding:0;background:${C.bg};font-family:Inter,Roboto,Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;padding:24px 16px">

  <!-- HEADER -->
  <tr><td>
    <div style="background:linear-gradient(135deg,#6366F1,#8B5CF6);border-radius:16px;padding:28px;color:#fff;margin-bottom:20px">
      <div style="margin-bottom:12px">
        <span style="font-size:18px;font-weight:700">📊 Hermes Analítico</span>
        <span style="display:block;font-size:13px;opacity:0.85;margin-top:2px">Reporte semanal · ${weekLabel}</span>
      </div>
      <div style="font-size:22px;font-weight:700;margin-bottom:8px;line-height:1.3">${report.headline}</div>
      <div style="font-size:14px;opacity:0.9;line-height:1.6">${report.executiveSummary}</div>
    </div>
  </td></tr>

  <!-- MÉTRICAS -->
  <tr><td style="padding-bottom:16px">
    <div style="font-size:12px;font-weight:600;color:${C.muted};text-transform:uppercase;letter-spacing:.06em;margin-bottom:10px">MÉTRICAS DE LA SEMANA</div>
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        ${metricBox(String(metrics.pipeline.newLeadsThisWeek), "Leads nuevos", C.primary)}
        ${metricBox(`${metrics.pipeline.conversionRate}%`, "Tasa conversión", C.success)}
      </tr>
      <tr>
        ${metricBox(String(metrics.appointments.completedThisWeek), "Citas completadas", "#0EA5E9")}
        ${metricBox(`$${(metrics.revenue.confirmedThisMonth / 1000).toFixed(1)}K`, "Ingresos confirmados", C.warning)}
      </tr>
    </table>
  </td></tr>

  <!-- PRIORIDAD #1 -->
  <tr><td style="padding-bottom:16px">
    <div style="background:#FEF3C7;border:1px solid #FCD34D;border-radius:12px;padding:16px">
      <div style="font-size:12px;font-weight:600;color:#92400E;text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">⚡ TU PRIORIDAD ESTA SEMANA</div>
      <div style="font-size:15px;color:${C.text};font-weight:500;line-height:1.6">${report.topPriority}</div>
    </div>
  </td></tr>

  <!-- INSIGHTS -->
  <tr><td style="padding-bottom:8px">
    <div style="font-size:12px;font-weight:600;color:${C.muted};text-transform:uppercase;letter-spacing:.06em;margin-bottom:10px">INSIGHTS ACCIONABLES</div>
    ${report.insights
      .map(
        (ins) => `
    <div style="background:${C.card};border:1px solid ${C.border};border-radius:12px;padding:16px;margin-bottom:10px">
      <div style="margin-bottom:8px">
        <span style="font-size:14px;font-weight:600;color:${C.text}">${ins.title}</span>
        <span style="margin-left:8px">${typeBadge(ins.type)} ${priorityBadge(ins.priority)}</span>
      </div>
      <div style="font-size:13px;color:${C.muted};line-height:1.6;margin-bottom:10px">${ins.description}</div>
      <div style="background:#F0FDF4;border-left:3px solid ${C.success};padding:10px 12px;border-radius:0 8px 8px 0">
        <div style="font-size:12px;font-weight:600;color:#065F46;margin-bottom:2px">ACCIÓN RECOMENDADA</div>
        <div style="font-size:13px;color:#064E3B">${ins.action}</div>
      </div>
    </div>`
      )
      .join("")}
  </td></tr>

  <!-- CUELLO DE BOTELLA -->
  ${
    report.bottleneck
      ? `<tr><td style="padding-bottom:16px">
    <div style="background:#FEF2F2;border:1px solid #FECACA;border-radius:12px;padding:16px">
      <div style="font-size:12px;font-weight:600;color:#991B1B;text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">🚧 CUELLO DE BOTELLA DETECTADO</div>
      <div style="font-size:14px;font-weight:600;color:${C.text};margin-bottom:4px">Etapa: ${report.bottleneck.stage}</div>
      <div style="font-size:13px;color:${C.muted};margin-bottom:10px">${report.bottleneck.reason}</div>
      <div style="font-size:13px;color:#991B1B;font-weight:500">💡 ${report.bottleneck.suggestion}</div>
    </div>
  </td></tr>`
      : ""
  }

  <!-- PROYECCIÓN -->
  <tr><td style="padding-bottom:16px">
    <div style="background:${C.card};border:1px solid ${C.border};border-radius:12px;padding:16px">
      <div style="font-size:12px;font-weight:600;color:${C.muted};text-transform:uppercase;letter-spacing:.06em;margin-bottom:12px">💰 PROYECCIÓN DE INGRESOS</div>
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="text-align:center;padding:8px">
            <div style="font-size:11px;color:${C.muted};margin-bottom:4px">Este mes</div>
            <div style="font-size:22px;font-weight:700;color:${C.primary}">$${report.revenueProjection.thisMonth.toLocaleString()}</div>
          </td>
          <td style="text-align:center;font-size:22px;color:${C.muted}">→</td>
          <td style="text-align:center;padding:8px">
            <div style="font-size:11px;color:${C.muted};margin-bottom:4px">Próximo mes</div>
            <div style="font-size:22px;font-weight:700;color:${C.success}">$${report.revenueProjection.nextMonth.toLocaleString()}</div>
          </td>
        </tr>
      </table>
      <div style="font-size:13px;color:${C.muted};margin-top:10px;line-height:1.6">${report.revenueProjection.commentary}</div>
    </div>
  </td></tr>

  <!-- CIERRE -->
  <tr><td style="padding-bottom:16px">
    <div style="background:linear-gradient(135deg,#1E1B4B,#312E81);border-radius:12px;padding:20px;color:#fff">
      <div style="font-size:13px;line-height:1.7;opacity:0.9;margin-bottom:16px">${report.motivationalClose}</div>
      <a href="${appUrl}/dashboard" style="display:inline-block;background:#6366F1;color:#fff;padding:10px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:13px">
        Ver dashboard completo →
      </a>
    </div>
  </td></tr>

  <!-- FOOTER -->
  <tr><td style="text-align:center;padding:20px 0">
    <div style="font-size:11px;color:${C.muted}">
      Hermes CRM Dental · Reporte generado automáticamente cada lunes a las 8 AM<br>
      <a href="${appUrl}/settings" style="color:${C.muted}">Configurar reportes</a>
    </div>
  </td></tr>

</table>
</body>
</html>`;
}

export function buildReportEmailText(
  metrics: ClinicMetrics,
  report: GeneratedReport
): string {
  return `HERMES ANALÍTICO — Reporte Semanal
${metrics.clinic.name}

${report.headline}

${report.executiveSummary}

─────────────────────────────
TU PRIORIDAD ESTA SEMANA
${report.topPriority}

─────────────────────────────
MÉTRICAS
• Leads nuevos: ${metrics.pipeline.newLeadsThisWeek}
• Conversión: ${metrics.pipeline.conversionRate}%
• Citas completadas: ${metrics.appointments.completedThisWeek}

─────────────────────────────
INSIGHTS
${report.insights.map((i, n) => `${n + 1}. [${i.type.toUpperCase()}] ${i.title}\n   ${i.description}\n   → ${i.action}`).join("\n\n")}

─────────────────────────────
${report.motivationalClose}

Ver dashboard: ${process.env.NEXT_PUBLIC_APP_URL ?? "https://hermescrm.app"}/dashboard`.trim();
}
