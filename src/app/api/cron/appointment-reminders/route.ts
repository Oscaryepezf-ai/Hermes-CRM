import { NextRequest, NextResponse } from "next/server";
import { verifyCron } from "@/lib/cron-auth"
import { processAppointmentReminders } from "@/lib/agendador/reminder";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const denied = verifyCron(request)
  if (denied) return denied

  try {
    const result = await processAppointmentReminders();
    return NextResponse.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
