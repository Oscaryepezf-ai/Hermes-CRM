import { Suspense } from "react";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  TrendingUp,
  Target,
  DollarSign,
  CalendarCheck,
  Calendar,
} from "lucide-react";
import { auth } from "../../../../auth";
import { getDashboardMetrics } from "@/lib/actions/analytics";
import { db } from "@/lib/db";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { ConversionChart } from "@/components/dashboard/ConversionChart";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { ActivationChecklist } from "@/components/dashboard/ActivationChecklist";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { mockMetrics, mockActivityFeed } from "@/lib/mock-data";
import { formatCurrency } from "@/lib/utils";

async function DashboardContent() {
  const session = await auth();
  if (!session?.user?.clinicId) redirect("/login");

  const [metricsRes, recentHistory] = await Promise.all([
    getDashboardMetrics(),
    db.leadHistory.findMany({
      where: { lead: { clinicId: session.user.clinicId } },
      include: {
        user: { select: { name: true } },
        lead: { select: { fullName: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  const metrics = metricsRes.success ? metricsRes.data : mockMetrics;

  const activity = recentHistory.map((h) => ({
    id: h.id,
    user: h.user?.name ?? "Hermes IA",
    action: h.fromStage ? "movió" : "creó lead",
    subject: h.lead.fullName,
    fromStage: h.fromStage ?? null,
    toStage: h.toStage,
    time: h.createdAt,
  }));

  const upcomingToday = await db.appointment.count({
    where: {
      clinicId: session.user.clinicId,
      scheduledAt: {
        gte: new Date(new Date().setHours(0, 0, 0, 0)),
        lte: new Date(new Date().setHours(23, 59, 59, 999)),
      },
      status: { in: ["SCHEDULED", "CONFIRMED"] },
    },
  });

  const greetingName = session.user.name?.trim().split(/\s+/).pop() ?? "";
  const today = format(new Date(), "dd/MM/yyyy", { locale: es });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-ink-primary tracking-tight">¡Hola, {greetingName}!</h1>
          <p className="text-sm text-ink-tertiary mt-1">
            {upcomingToday > 0
              ? `Tienes ${upcomingToday} ${upcomingToday === 1 ? "cita pendiente" : "citas pendientes"} hoy.`
              : "Resumen del día."}
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-ink-tertiary text-[13px] bg-surface rounded-full px-3.5 h-9" style={{ boxShadow: "var(--shadow-card)" }}>
          <Calendar className="w-4 h-4" />
          {today}
        </div>
      </div>

      <ActivationChecklist />

      {/* Fila 1: Métricas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <MetricCard
          title="Total leads"
          value={String(metrics.totalLeads)}
          icon={TrendingUp}
          tone="brand"
        />
        <MetricCard
          title="Tasa de conversión"
          value={`${metrics.conversionRate}%`}
          icon={Target}
          tone="violet"
        />
        <MetricCard
          title="Ingresos este mes"
          value={formatCurrency(metrics.monthlyRevenue, "USD")}
          icon={DollarSign}
          featured
        />
        <MetricCard
          title="Citas este mes"
          value={String(metrics.appointmentsThisMonth)}
          subtitle={upcomingToday > 0 ? `${upcomingToday} pendientes hoy` : "Al día"}
          icon={CalendarCheck}
          tone="emerald"
        />
      </div>

      {/* Fila 2: Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 md:gap-4">
        <div className="lg:col-span-2 min-w-0"><RevenueChart data={metrics.revenueByMonth} /></div>
        <div className="min-w-0"><ConversionChart data={metrics.leadsBySource} /></div>
      </div>

      {/* Fila 3: Embudo + Actividad */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-[15px] font-semibold text-ink-primary">
              Embudo de conversión
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {metrics.conversionByStage.map((stage, idx) => (
                <div key={`${stage.stage}-${idx}`}>
                  <div className="flex justify-between text-[13px] mb-1.5">
                    <span className="text-ink-primary font-medium">{stage.stage}</span>
                    <span className="text-ink-tertiary tabular-nums">
                      {stage.count} leads · {stage.percentage}%
                    </span>
                  </div>
                  <div
                    className="h-2 rounded-full bg-inset overflow-hidden"
                    role="progressbar"
                    aria-valuenow={stage.percentage}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={stage.stage}
                  >
                    <div
                      className="h-full rounded-full bg-brand-gradient"
                      style={{ width: `${Math.max(stage.percentage, stage.count > 0 ? 3 : 0)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <ActivityFeed
          items={
            activity.length > 0
              ? activity
              : mockActivityFeed
          }
        />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent />
    </Suspense>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 bg-surface rounded-lg w-48" />
      <div className="grid grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-32 bg-surface rounded-2xl" style={{ boxShadow: "var(--shadow-card)" }} />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="h-64 bg-surface rounded-2xl" style={{ boxShadow: "var(--shadow-card)" }} />
        <div className="h-64 bg-surface rounded-2xl" style={{ boxShadow: "var(--shadow-card)" }} />
      </div>
    </div>
  );
}
