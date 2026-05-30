"use server";

import { db } from "@/lib/db";
import { auth } from "../../../auth";
import type { ActionResponse, DashboardMetrics } from "@/types";

async function getSession() {
  const session = await auth();
  if (!session?.user?.clinicId) throw new Error("No autorizado");
  return session;
}

export async function getDashboardMetrics(): Promise<ActionResponse<DashboardMetrics>> {
  try {
    const session = await getSession();
    const clinicId = session.user.clinicId;

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    // Totales generales
    const [totalLeads, totalPatients, stages] = await Promise.all([
      db.lead.count({ where: { clinicId } }),
      db.patient.count({ where: { clinicId } }),
      db.pipelineStage.findMany({
        where: { clinicId },
        include: { _count: { select: { leads: true } } },
        orderBy: { order: "asc" },
      }),
    ]);

    const conversionRate =
      totalLeads > 0 ? Math.round((totalPatients / totalLeads) * 100) : 0;

    // Ingresos del mes actual
    const monthlyAppointments = await db.appointment.findMany({
      where: {
        clinicId,
        status: "COMPLETED",
        scheduledAt: { gte: startOfMonth },
      },
      select: { value: true },
    });

    const monthlyRevenue = monthlyAppointments.reduce(
      (sum, a) => sum + (a.value ?? 0),
      0
    );

    // Citas este mes
    const appointmentsThisMonth = await db.appointment.count({
      where: {
        clinicId,
        scheduledAt: { gte: startOfMonth },
        status: { not: "CANCELLED" },
      },
    });

    // Leads por fuente
    const leadsBySourceRaw = await db.lead.groupBy({
      by: ["source"],
      where: { clinicId },
      _count: { source: true },
    });

    const sourceLabels: Record<string, string> = {
      REFERIDO: "Referido",
      INSTAGRAM: "Instagram",
      FACEBOOK: "Facebook",
      GOOGLE: "Google",
      TIKTOK: "TikTok",
      WHATSAPP: "WhatsApp",
      OTRO: "Otro",
    };

    const leadsBySource = leadsBySourceRaw.map((r) => ({
      source: sourceLabels[r.source] ?? r.source,
      count: r._count.source,
    }));

    // Conversión por etapa
    const conversionByStage = stages.map((s) => ({
      stage: s.name,
      count: s._count.leads,
      percentage:
        totalLeads > 0 ? Math.round((s._count.leads / totalLeads) * 100) : 0,
    }));

    // Ingresos por mes (últimos 6 meses)
    const revenueByMonth = await Promise.all(
      Array.from({ length: 6 }, (_, i) => {
        const date = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
        const end = new Date(date.getFullYear(), date.getMonth() + 1, 1);
        return db.appointment
          .findMany({
            where: {
              clinicId,
              status: "COMPLETED",
              scheduledAt: { gte: date, lt: end },
            },
            select: { value: true },
          })
          .then((appts) => ({
            month: date.toLocaleDateString("es-CO", { month: "short", year: "2-digit" }),
            value: appts.reduce((sum, a) => sum + (a.value ?? 0), 0),
          }));
      })
    );

    // Top procedimientos
    const proceduresRaw = await db.appointment.groupBy({
      by: ["procedure"],
      where: { clinicId, status: "COMPLETED" },
      _count: { procedure: true },
      _sum: { value: true },
      orderBy: { _count: { procedure: "desc" } },
      take: 5,
    });

    const topProcedures = proceduresRaw.map((p) => ({
      name: p.procedure,
      count: p._count.procedure,
      revenue: p._sum.value ?? 0,
    }));

    return {
      success: true,
      data: {
        totalLeads,
        conversionRate,
        monthlyRevenue,
        appointmentsThisMonth,
        leadsBySource,
        conversionByStage,
        revenueByMonth,
        topProcedures,
      },
    };
  } catch (error) {
    console.error("[getDashboardMetrics]", error);
    return { success: false, error: "Error al obtener las métricas" };
  }
}
