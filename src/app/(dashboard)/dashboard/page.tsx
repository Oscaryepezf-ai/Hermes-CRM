import { Suspense } from "react";
import { redirect } from "next/navigation";
import {
  TrendingUp,
  Target,
  DollarSign,
  CalendarCheck,
} from "lucide-react";
import { auth } from "../../../../auth";
import { getDashboardMetrics } from "@/lib/actions/analytics";
import { db } from "@/lib/db";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { ConversionChart } from "@/components/dashboard/ConversionChart";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
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
    user: h.user.name,
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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-ink-primary">Dashboard</h2>
        <p className="text-sm text-ink-tertiary mt-0.5">
          Resumen de actividad de tu clínica
        </p>
      </div>

      {/* Fila 1: Métricas */}
      <div className="grid grid-cols-4 gap-4">
        <MetricCard
          title="Total Leads"
          value={String(metrics.totalLeads)}
          icon={TrendingUp}
        />
        <MetricCard
          title="Tasa de Conversión"
          value={`${metrics.conversionRate}%`}
          icon={Target}
         
        />
        <MetricCard
          title="Ingresos este mes"
          value={formatCurrency(metrics.monthlyRevenue, "COP")}
          icon={DollarSign}
         
        />
        <MetricCard
          title="Citas este mes"
          value={String(metrics.appointmentsThisMonth)}
          subtitle={upcomingToday > 0 ? `${upcomingToday} pendientes hoy` : "Al día"}
          icon={CalendarCheck}
         
        />
      </div>

      {/* Fila 2: Gráficos */}
      <div className="grid grid-cols-2 gap-4">
        <RevenueChart data={metrics.revenueByMonth} />
        <ConversionChart data={metrics.leadsBySource} />
      </div>

      {/* Fila 3: Embudo + Actividad */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-surface shadow-card border-line-subtle">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-ink-secondary">
              Embudo de conversión
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {metrics.conversionByStage.map((stage, idx) => (
                <div key={`${stage.stage}-${idx}`}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-ink-secondary font-medium">{stage.stage}</span>
                    <span className="text-ink-tertiary">
                      {stage.count} leads · {stage.percentage}%
                    </span>
                  </div>
                  <Progress value={stage.percentage} className="h-2" />
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
      <div className="h-7 bg-inset rounded w-32" />
      <div className="grid grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 bg-inset rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="h-56 bg-inset rounded-xl" />
        <div className="h-56 bg-inset rounded-xl" />
      </div>
    </div>
  );
}
