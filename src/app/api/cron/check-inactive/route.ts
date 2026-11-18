import { NextResponse } from "next/server"
import { verifyCron } from "@/lib/cron-auth"
import { checkAndMarkInactiveLeads } from "@/lib/journey/auto-transitions"

export const runtime = "nodejs"
export const maxDuration = 60

export async function GET(request: Request) {
  const denied = verifyCron(request)
  if (denied) return denied

  const result = await checkAndMarkInactiveLeads()
  return NextResponse.json({ ok: true, ...result })
}
