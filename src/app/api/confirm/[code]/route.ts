import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "";

  if (!code) {
    return NextResponse.redirect(`${base}/confirm/invalid`);
  }

  try {
    const appointment = await db.appointment.findFirst({
      where: { confirmationCode: code },
    });

    if (!appointment) {
      return NextResponse.redirect(`${base}/confirm/invalid`);
    }

    if (appointment.status === "CANCELLED") {
      return NextResponse.redirect(`${base}/confirm/cancelled`);
    }

    await db.appointment.update({
      where: { id: appointment.id },
      data: {
        patientConfirmed: true,
        reminderStatus: "CONFIRMED",
        status: "CONFIRMED",
      },
    });

    return NextResponse.redirect(`${base}/confirm/success`);
  } catch {
    return NextResponse.redirect(`${base}/confirm/error`);
  }
}
