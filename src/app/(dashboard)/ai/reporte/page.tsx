"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  Target,
  BarChart3,
  Users,
  Calendar,
  DollarSign,
  RefreshCw,
} from "lucide-react";
import type { ClinicMetrics } from "@/lib/analytics/pipeline-metrics";
import type { GeneratedReport } from "@/lib/analytics/report-generator";

type ReportData = {
  metrics: ClinicMetrics;
  report: GeneratedReport;
};

const PRIORITY_STYLES = {
  alta: "bg-red-50 text-red-700 border-red-200",
  media: "bg-amber-50 text-amber-700 border-amber-200",
  baja: "bg-green-50 text-green-700 border-green-200",
};
const TYPE_STYLES = {
  problema: "bg-red-100 text-red-800",
  oportunidad: "bg-blue-100 text-blue-800",
  logro: "bg-emerald-100 text-emerald-800",
};

function MetricCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-medical-border p-5 shadow-sm">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${color}`}>
        <Icon className="w-4 h-4 text-white" />
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-sm text-gray-500 mt-0.5">{label}</p>
    </div>
  );
}

export default function ReportePage() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchReport() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/analytics/report");
      if (!res.ok) throw new Error("Error al generar el reporte");
      const json = await res.json();
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchReport();
  }, []);

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/ai"
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Reporte Semanal</h1>
            <p className="text-sm text-gray-400">Generado por Hermes Analítico · IA</p>
          </div>
        </div>
        <button
          onClick={fetchReport}
          disabled={loading}
          className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-700 font-medium disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Regenerar
        </button>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-pink-600 flex items-center justify-center shadow-md">
            <Loader2 className="w-7 h-7 text-white animate-spin" />
          </div>
          <div className="text-center">
            <p className="font-semibold text-gray-800">Analizando tu pipeline...</p>
            <p className="text-sm text-gray-400 mt-1">
              Hermes está procesando tus datos con IA. Puede tardar unos segundos.
            </p>
          </div>
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
          <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-3" />
          <p className="font-semibold text-red-800">{error}</p>
          <button
            onClick={fetchReport}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* Report content */}
      {data && !loading && (
        <>
          {/* Headline */}
          <div className="bg-gradient-to-br from-violet-500 to-pink-600 rounded-2xl p-6 text-white shadow-md">
            <p className="text-xs font-semibold opacity-70 uppercase tracking-widest mb-2">
              Hermes Analítico
            </p>
            <h2 className="text-2xl font-bold leading-tight mb-3">
              {data.report.headline}
            </h2>
            <p className="text-sm opacity-90 leading-relaxed">
              {data.report.executiveSummary}
            </p>
          </div>

          {/* Metrics grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <MetricCard
              icon={Users}
              label="Leads nuevos"
              value={data.metrics.pipeline.newLeadsThisWeek}
              color="bg-indigo-500"
            />
            <MetricCard
              icon={TrendingUp}
              label="Tasa conversión"
              value={`${data.metrics.pipeline.conversionRate}%`}
              color="bg-emerald-500"
            />
            <MetricCard
              icon={Calendar}
              label="Citas completadas"
              value={data.metrics.appointments.completedThisWeek}
              color="bg-sky-500"
            />
            <MetricCard
              icon={DollarSign}
              label="Ingreso confirmado"
              value={`$${(data.metrics.revenue.confirmedThisMonth / 1000).toFixed(1)}K`}
              color="bg-amber-500"
            />
          </div>

          {/* Top priority */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-4 h-4 text-amber-600" />
              <span className="text-xs font-bold text-amber-700 uppercase tracking-wide">
                Tu prioridad esta semana
              </span>
            </div>
            <p className="text-sm font-semibold text-gray-800 leading-relaxed">
              {data.report.topPriority}
            </p>
          </div>

          {/* Insights */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-amber-500" />
              <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">
                Insights accionables
              </h3>
            </div>
            {data.report.insights.map((ins, i) => (
              <div
                key={i}
                className="bg-white border border-medical-border rounded-2xl p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <p className="font-semibold text-gray-900 text-sm">{ins.title}</p>
                  <div className="flex gap-1.5 flex-shrink-0">
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${TYPE_STYLES[ins.type]}`}
                    >
                      {ins.type}
                    </span>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${PRIORITY_STYLES[ins.priority]}`}
                    >
                      {ins.priority}
                    </span>
                  </div>
                </div>
                <p className="text-sm text-gray-500 leading-relaxed mb-3">
                  {ins.description}
                </p>
                <div className="bg-emerald-50 border-l-[3px] border-emerald-500 rounded-r-lg px-3 py-2">
                  <p className="text-xs font-bold text-emerald-700 mb-0.5">
                    ACCIÓN RECOMENDADA
                  </p>
                  <p className="text-xs text-emerald-800 leading-relaxed">{ins.action}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Bottleneck */}
          {data.report.bottleneck && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                <span className="text-xs font-bold text-red-700 uppercase tracking-wide">
                  Cuello de botella detectado
                </span>
              </div>
              <p className="font-semibold text-gray-900 text-sm mb-1">
                Etapa: {data.report.bottleneck.stage}
              </p>
              <p className="text-sm text-gray-600 leading-relaxed mb-3">
                {data.report.bottleneck.reason}
              </p>
              <p className="text-sm font-medium text-red-700">
                💡 {data.report.bottleneck.suggestion}
              </p>
            </div>
          )}

          {/* Revenue projection */}
          <div className="bg-white border border-medical-border rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-4 h-4 text-violet-500" />
              <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">
                Proyección de ingresos
              </h3>
            </div>
            <div className="flex items-center justify-around mb-4">
              <div className="text-center">
                <p className="text-xs text-gray-400 mb-1">Este mes</p>
                <p className="text-2xl font-bold text-indigo-600">
                  ${data.report.revenueProjection.thisMonth.toLocaleString()}
                </p>
              </div>
              <span className="text-2xl text-gray-300">→</span>
              <div className="text-center">
                <p className="text-xs text-gray-400 mb-1">Próximo mes</p>
                <p className="text-2xl font-bold text-emerald-600">
                  ${data.report.revenueProjection.nextMonth.toLocaleString()}
                </p>
              </div>
            </div>
            <p className="text-sm text-gray-500 leading-relaxed">
              {data.report.revenueProjection.commentary}
            </p>
          </div>

          {/* Motivational close */}
          <div className="bg-gradient-to-br from-indigo-900 to-violet-900 rounded-2xl p-6 text-white">
            <p className="text-sm leading-relaxed opacity-90">
              {data.report.motivationalClose}
            </p>
          </div>

          {/* Stuck leads */}
          {data.metrics.pipeline.stuckLeads.length > 0 && (
            <div className="bg-white border border-medical-border rounded-2xl p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">
                  Leads atascados (+7 días sin actividad)
                </h3>
              </div>
              <div className="space-y-2">
                {data.metrics.pipeline.stuckLeads.map((l) => (
                  <div
                    key={l.id}
                    className="flex items-center justify-between py-2 border-b border-medical-border last:border-0"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">{l.fullName}</p>
                      <p className="text-xs text-gray-400">
                        {l.stage} · {l.treatment}
                      </p>
                    </div>
                    <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full">
                      {l.daysStuck} días
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
