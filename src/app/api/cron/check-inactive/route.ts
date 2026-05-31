import { NextResponse } from "next/server"
import { checkAndMarkInactiveLeads } from "@/lib/journey/auto-transitions"

export const runtime = "nodejs"
export const maxDuration = 60

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const result = await checkAndMarkInactiveLeads()
  return NextResponse.json({ ok: true, ...result })
}
