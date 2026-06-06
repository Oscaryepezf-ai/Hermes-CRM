import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export const dynamic = "force-dynamic"

const GRAPH = "https://graph.facebook.com/v18.0"

export async function GET() {
  const info: Record<string, unknown> = {}

  try {
    // ── 1. Get stored page token and page ID ─────────────────
    const channel = await db.clinicChannel.findFirst({
      where:  { channel: "FACEBOOK", isActive: true },
      select: { pageId: true, accessToken: true, clinicId: true, metadata: true },
    })
    if (!channel?.pageId || !channel?.accessToken) {
      return NextResponse.json({ error: "No active Facebook channel found" }, { status: 404 })
    }

    const { pageId, accessToken: pageToken } = channel
    info.pageId   = pageId
    info.metadata = channel.metadata

    // ── 2. Verify page token is still valid ───────────────────
    const meRes  = await fetch(`${GRAPH}/me?access_token=${pageToken}&fields=id,name`)
    const meData = await meRes.json()
    info.token_valid = meRes.ok
    info.page_identity = meRes.ok ? { id: meData.id, name: meData.name } : { error: meData.error?.message }

    // ── 3. Check page webhook subscription ────────────────────
    const subRes  = await fetch(`${GRAPH}/${pageId}/subscribed_apps?access_token=${pageToken}`)
    const subData = await subRes.json()
    info.page_subscriptions = subData

    // ── 4. Check app access token + app mode ──────────────────
    const appId     = process.env.META_APP_ID     ?? ""
    const appSecret = process.env.META_APP_SECRET ?? ""
    const appToken  = `${appId}|${appSecret}`

    const appRes  = await fetch(`${GRAPH}/${appId}?access_token=${appToken}&fields=id,name,status`)
    const appData = await appRes.json()
    info.app = appRes.ok ? appData : { error: appData.error?.message }

    // ── 5. Re-subscribe page (idempotent fix) ─────────────────
    const resubBody = new URLSearchParams({
      subscribed_fields: "messages,messaging_postbacks,message_deliveries,message_reads",
      access_token: pageToken,
    })
    const resubRes  = await fetch(`${GRAPH}/${pageId}/subscribed_apps`, {
      method:  "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body:    resubBody.toString(),
    })
    const resubData = await resubRes.json()
    info.resubscribe_result = resubData

    return NextResponse.json({ ok: true, info })
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err), info }, { status: 500 })
  }
}
