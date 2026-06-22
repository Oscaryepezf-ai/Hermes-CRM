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

  const greetingName = session.user.name?.trim().split(/\s+/).pop() ?? "";
  const today = format(new Date(), "dd/MM/yyyy", { locale: es });

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl border border-line-subtle bg-gradient-to-br from-white to-sky-50 dark:from-[#10151c] dark:to-[#0c1f2e] p-6 shadow-card">
        <div className="absolute -top-12 -right-12 w-44 h-44 rounded-full bg-sky-200/50 dark:bg-sky-500/10 blur-2xl pointer-events-none" />
        <div className="relative flex items-center gap-1.5 text-ink-tertiary text-[13px] mb-4">
          <Calendar className="w-4 h-4" />
          {today}
        </div>
        <h2 className="relative text-2xl font-bold text-ink-primary">¡Hola, {greetingName}!</h2>
        <p className="relative text-sm text-ink-tertiary mt-1">Resumen del día</p>
      </div>

      <ActivationChecklist />

      {/* Fila 1: Métricas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
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
          value={formatCurrency(metrics.monthlyRevenue, "USD")}
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
        <RevenueChart data={metrics.revenueByMonth} />
        <ConversionChart data={metrics.leadsBySource} />
      </div>

      {/* Fila 3: Embudo + Actividad */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
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
