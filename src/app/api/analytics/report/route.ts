import { NextResponse } from "next/server";
import { auth } from "../../../../../auth";
import { getClinicMetrics } from "@/lib/analytics/pipeline-metrics";
import { generateAnalyticsReport } from "@/lib/analytics/report-generator";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET() {
  const session = await auth();
  if (!session?.user?.clinicId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const metrics = await getClinicMetrics(session.user.clinicId);
    const report = await generateAnalyticsReport(metrics, session.user.clinicId);
    return NextResponse.json({ success: true, metrics, report });
  } catch (error) {
    console.error("Error generating analytics report:", error);
    return NextResponse.json(
      { success: false, error: "Error generando el reporte" },
      { status: 500 }
    );
  }
}
