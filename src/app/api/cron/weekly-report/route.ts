import { NextRequest, NextResponse } from "next/server";
import {
  getActiveClinics,
  getClinicMetrics,
} from "@/lib/analytics/pipeline-metrics";
import { generateAnalyticsReport } from "@/lib/analytics/report-generator";
import {
  buildReportEmailHTML,
  buildReportEmailText,
} from "@/lib/analytics/report-email";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: "Resend no configurado" }, { status: 503 });
  }

  const { Resend } = await import("resend");
  const resend = new Resend(process.env.RESEND_API_KEY);
  const clinicIds = await getActiveClinics();
  const results: {
    clinicId: string;
    status: "sent" | "error";
    error?: string;
  }[] = [];

  for (const clinicId of clinicIds) {
    try {
      const metrics = await getClinicMetrics(clinicId);

      if (!metrics.clinic.ownerEmail) {
        results.push({ clinicId, status: "error", error: "No owner email" });
        continue;
      }

      const report = await generateAnalyticsReport(metrics, clinicId);
      const html = buildReportEmailHTML(metrics, report);
      const text = buildReportEmailText(metrics, report);

      await resend.emails.send({
        from: process.env.EMAIL_FROM ?? "reportes@hermescrm.app",
        to: metrics.clinic.ownerEmail,
        subject: `📊 ${report.headline} — ${metrics.clinic.name}`,
        html,
        text,
      });

      results.push({ clinicId, status: "sent" });

      // Respect OpenAI rate limits between clinics
      await new Promise((r) => setTimeout(r, 2000));
    } catch (error) {
      console.error(`Error processing clinic ${clinicId}:`, error);
      results.push({
        clinicId,
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  const sent = results.filter((r) => r.status === "sent").length;
  const errors = results.filter((r) => r.status === "error").length;

  return NextResponse.json({
    success: true,
    summary: { total: clinicIds.length, sent, errors },
    results,
    timestamp: new Date().toISOString(),
  });
}
