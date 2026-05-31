import { NextResponse } from "next/server";
import { auth } from "../../../../../auth";
import { disconnectCalendar } from "@/lib/google-calendar/oauth";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await disconnectCalendar(session.user.id);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Error al desconectar el calendario" },
      { status: 500 }
    );
  }
}
