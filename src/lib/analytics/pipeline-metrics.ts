import { db } from "@/lib/db";
import {
  subDays,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  subMonths,
  addMonths,
  differenceInDays,
  format,
} from "date-fns";
import { es } from "date-fns/locale";

export type ClinicMetrics = {
  clinic: {
    id: string;
    name: string;
    ownerEmail: string;
  };
  period: {
    weekStart: Date;
    weekEnd: Date;
  };
  pipeline: {
    totalLeads: number;
    newLeadsThisWeek: number;
    newLeadsLastWeek: number;
    conversionRate: number;
    avgDaysToConvert: number;
    leadsByStage: {
      stage: string;
      count: number;
      avgDaysInStage: number;
    }[];
    leadsBySource: {
      source: string;
      count: number;
      conversionRate: number;
    }[];
    stuckLeads: {
      id: string;
      fullName: string;
      stage: string;
      daysStuck: number;
      treatment: string;
    }[];
  };
  appointments: {
    scheduledThisWeek: number;
    completedThisWeek: number;
    cancelledThisWeek: number;
    noShowThisWeek: number;
    attendanceRate: number;
  };
  revenue: {
    projectedThisMonth: number;
    confirmedThisMonth: number;
    projectedNextMonth: number;
    revenueByTreatment: {
      treatment: string;
      count: number;
      totalValue: number;
    }[];
    monthlyTrend: {
      month: string;
      confirmed: number;
      projected: number;
    }[];
  };
  alerts: {
    type: "warning" | "critical" | "opportunity";
    message: string;
    value?: number;
  }[];
};

const STATUS_LABELS: Record<string, string> = {
  NUEVO: "Nuevo",
  CONTACTADO: "Contactado",
  CITA_AGENDADA: "Cita Agendada",
  PRESUPUESTO_ENVIADO: "Presupuesto Enviado",
  CONVERTIDO: "Convertido",
  PERDIDO: "Perdido",
};

export async function getClinicMetrics(clinicId: string): Promise<ClinicMetrics> {
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const last7 = subDays(now, 7);
  const last14 = subDays(now, 14);
  const last30 = subDays(now, 30);

  // 1. Clinic data + owner email
  const clinic = await db.clinic.findUniqueOrThrow({
    where: { id: clinicId },
    include: {
      users: {
        where: { role: "ADMIN" },
        select: { email: true },
        take: 1,
      },
    },
  });
  const ownerEmail = clinic.users[0]?.email ?? "";

  // 2. Lead volume this week vs last week
  const [totalLeads, newThisWeek, newLastWeek] = await Promise.all([
    db.lead.count({
      where: { clinicId, status: { notIn: ["CONVERTIDO", "PERDIDO"] } },
    }),
    db.lead.count({ where: { clinicId, createdAt: { gte: weekStart } } }),
    db.lead.count({ where: { clinicId, createdAt: { gte: last14, lt: last7 } } }),
  ]);

  // 3. Active leads grouped by status (pipeline stage)
  const statusGroups = await db.lead.groupBy({
    by: ["status"],
    where: { clinicId, status: { notIn: ["CONVERTIDO", "PERDIDO"] } },
    _count: { id: true },
  });

  const leadsByStage = await Promise.all(
    statusGroups.map(async (g) => {
      const leads = await db.lead.findMany({
        where: { clinicId, status: g.status },
        select: { updatedAt: true },
      });
      const avgDaysInStage =
        leads.length > 0
          ? Math.round(
              leads.reduce(
                (sum, l) => sum + differenceInDays(now, l.updatedAt),
                0
              ) / leads.length
            )
          : 0;
      return {
        stage: STATUS_LABELS[g.status] ?? g.status,
        count: g._count.id,
        avgDaysInStage,
      };
    })
  );

  // 4. Leads by marketing channel with conversion rate
  const channelGroups = await db.lead.groupBy({
    by: ["channel"],
    where: { clinicId },
    _count: { id: true },
  });
  const convertedByChannel = await db.lead.groupBy({
    by: ["channel"],
    where: { clinicId, status: "CONVERTIDO" },
    _count: { id: true },
  });
  const convertedMap = new Map(
    convertedByChannel.map((c) => [c.channel, c._count.id])
  );
  const leadsBySource = channelGroups.map((g) => {
    const converted = convertedMap.get(g.channel) ?? 0;
    return {
      source: g.channel as string,
      count: g._count.id,
      conversionRate:
        g._count.id > 0 ? Math.round((converted / g._count.id) * 100) : 0,
    };
  });

  // 5. Leads stuck for +7 days with no status change
  const stuckRaw = await db.lead.findMany({
    where: {
      clinicId,
      status: { notIn: ["CONVERTIDO", "PERDIDO"] },
      updatedAt: { lt: last7 },
    },
    select: {
      id: true,
      fullName: true,
      status: true,
      treatment: true,
      updatedAt: true,
    },
    orderBy: { updatedAt: "asc" },
    take: 10,
  });
  const stuckLeads = stuckRaw.map((l) => ({
    id: l.id,
    fullName: l.fullName,
    stage: STATUS_LABELS[l.status] ?? l.status,
    daysStuck: differenceInDays(now, l.updatedAt),
    treatment: l.treatment as string,
  }));

  // 6. Appointments this week grouped by status
  const apptGroups = await db.appointment.groupBy({
    by: ["status"],
    where: { clinicId, scheduledAt: { gte: weekStart, lte: weekEnd } },
    _count: { id: true },
  });
  const apptMap = new Map(apptGroups.map((a) => [a.status, a._count.id]));
  const completedThisWeek = apptMap.get("COMPLETED") ?? 0;
  const cancelledThisWeek = apptMap.get("CANCELLED") ?? 0;
  const noShowThisWeek = apptMap.get("NO_SHOW") ?? 0;
  const scheduledThisWeek = [...apptMap.values()].reduce((s, v) => s + v, 0);
  const attendanceRate =
    scheduledThisWeek > 0
      ? Math.round((completedThisWeek / scheduledThisWeek) * 100)
      : 0;

  // 7. Revenue — projected vs confirmed
  const [activeLeadsAgg, confirmedAgg, nextMonthLeadsAgg] = await Promise.all([
    db.lead.aggregate({
      where: {
        clinicId,
        status: { notIn: ["CONVERTIDO", "PERDIDO"] },
        estimatedValue: { not: null },
      },
      _sum: { estimatedValue: true },
    }),
    db.appointment.aggregate({
      where: {
        clinicId,
        status: "COMPLETED",
        scheduledAt: { gte: startOfMonth(now) },
        value: { not: null },
      },
      _sum: { value: true },
    }),
    db.lead.aggregate({
      where: {
        clinicId,
        status: { in: ["CITA_AGENDADA", "PRESUPUESTO_ENVIADO"] },
        estimatedValue: { not: null },
      },
      _sum: { estimatedValue: true },
    }),
  ]);

  // 8. Revenue by treatment (last 3 months)
  const treatmentGroups = await db.appointment.groupBy({
    by: ["procedure"],
    where: {
      clinicId,
      status: "COMPLETED",
      scheduledAt: { gte: subMonths(now, 3) },
    },
    _count: { id: true },
    _sum: { value: true },
  });
  const revenueByTreatment = treatmentGroups.map((t) => ({
    treatment: t.procedure,
    count: t._count.id,
    totalValue: t._sum.value ?? 0,
  }));

  // 9. Monthly revenue trend (3 months)
  const trendMonths = [subMonths(now, 2), subMonths(now, 1), now];
  const monthlyTrend = await Promise.all(
    trendMonths.map(async (m) => {
      const mStart = startOfMonth(m);
      const mEnd = startOfMonth(addMonths(m, 1));
      const [confirmed, projected] = await Promise.all([
        db.appointment.aggregate({
          where: {
            clinicId,
            status: "COMPLETED",
            scheduledAt: { gte: mStart, lt: mEnd },
            value: { not: null },
          },
          _sum: { value: true },
        }),
        db.lead.aggregate({
          where: {
            clinicId,
            createdAt: { gte: mStart, lt: mEnd },
            estimatedValue: { not: null },
          },
          _sum: { estimatedValue: true },
        }),
      ]);
      return {
        month: format(m, "MMM yyyy", { locale: es }),
        confirmed: confirmed._sum.value ?? 0,
        projected: projected._sum.estimatedValue ?? 0,
      };
    })
  );

  // 10. Conversion rate (30 days)
  const [leadsLast30, convertedLast30] = await Promise.all([
    db.lead.count({ where: { clinicId, createdAt: { gte: last30 } } }),
    db.lead.count({
      where: { clinicId, status: "CONVERTIDO", updatedAt: { gte: last30 } },
    }),
  ]);
  const conversionRate =
    leadsLast30 > 0 ? Math.round((convertedLast30 / leadsLast30) * 100) : 0;

  // 11. Average days lead → conversion
  const recentConverted = await db.lead.findMany({
    where: {
      clinicId,
      status: "CONVERTIDO",
      convertedAt: { not: null, gte: last30 },
    },
    select: { createdAt: true, convertedAt: true },
  });
  const avgDaysToConvert =
    recentConverted.length > 0
      ? Math.round(
          recentConverted.reduce(
            (sum, l) =>
              sum + differenceInDays(l.convertedAt!, l.createdAt),
            0
          ) / recentConverted.length
        )
      : 0;

  // 12. Automatic alerts
  const alerts: ClinicMetrics["alerts"] = [];
  if (conversionRate < 20 && leadsLast30 > 3)
    alerts.push({
      type: "warning",
      message: "Tasa de conversión por debajo del 20%",
      value: conversionRate,
    });
  if (stuckLeads.length > 5)
    alerts.push({
      type: "critical",
      message: `${stuckLeads.length} leads sin actividad en más de 7 días`,
    });
  if (noShowThisWeek > 2)
    alerts.push({
      type: "warning",
      message: `${noShowThisWeek} pacientes no asistieron esta semana`,
    });
  if (newThisWeek > newLastWeek * 1.3 && newLastWeek > 0)
    alerts.push({
      type: "opportunity",
      message: "Semana con 30%+ más leads que la anterior",
      value: newThisWeek,
    });

  return {
    clinic: { id: clinic.id, name: clinic.name, ownerEmail },
    period: { weekStart, weekEnd },
    pipeline: {
      totalLeads,
      newLeadsThisWeek: newThisWeek,
      newLeadsLastWeek: newLastWeek,
      conversionRate,
      avgDaysToConvert,
      leadsByStage,
      leadsBySource,
      stuckLeads,
    },
    appointments: {
      scheduledThisWeek,
      completedThisWeek,
      cancelledThisWeek,
      noShowThisWeek,
      attendanceRate,
    },
    revenue: {
      projectedThisMonth: activeLeadsAgg._sum.estimatedValue ?? 0,
      confirmedThisMonth: confirmedAgg._sum.value ?? 0,
      projectedNextMonth: nextMonthLeadsAgg._sum.estimatedValue ?? 0,
      revenueByTreatment,
      monthlyTrend,
    },
    alerts,
  };
}

// Returns all active clinic IDs for the weekly cron job.
// In production, add: stripeSubscriptionId: { not: null }
export async function getActiveClinics(): Promise<string[]> {
  const clinics = await db.clinic.findMany({ select: { id: true } });
  return clinics.map((c) => c.id);
}
