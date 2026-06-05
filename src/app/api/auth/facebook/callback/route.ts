import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

const GRAPH = "https://graph.facebook.com/v18.0"

type FacebookPage = {
  id:           string
  name:         string
  access_token: string
  category?:    string
  picture?:     { data: { url: string } }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code  = searchParams.get("code")
  const state = searchParams.get("state")
  const error = searchParams.get("error")

  const baseUrl     = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "")
  const redirectUri = `${baseUrl}/api/auth/facebook/callback`
  const settingsUrl = `${baseUrl}/settings/channels`

  if (error) {
    return NextResponse.redirect(`${settingsUrl}?fb_error=denied`)
  }

  if (!code || !state) {
    return NextResponse.redirect(`${settingsUrl}?fb_error=invalid`)
  }

  let clinicId: string
  try {
    const parsed = JSON.parse(Buffer.from(state, "base64url").toString())
    clinicId = parsed.clinicId
    if (!clinicId || typeof clinicId !== "string") throw new Error("no clinicId")
  } catch {
    return NextResponse.redirect(`${settingsUrl}?fb_error=invalid`)
  }

  const clinicExists = await db.clinic.findUnique({ where: { id: clinicId }, select: { id: true } })
  if (!clinicExists) {
    return NextResponse.redirect(`${settingsUrl}?fb_error=invalid`)
  }

  // 1. Exchange code for short-lived user token — POST with URLSearchParams (proper encoding)
  const tokenBody = new URLSearchParams({
    client_id:     process.env.META_APP_ID!,
    client_secret: process.env.META_APP_SECRET!,
    redirect_uri:  redirectUri,
    code,
  })

  console.log("[fb-callback] exchanging code, redirect_uri:", redirectUri, "app_id:", process.env.META_APP_ID)

  const tokenRes = await fetch(`${GRAPH}/oauth/access_token`, {
    method:  "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body:    tokenBody.toString(),
  })

  if (!tokenRes.ok) {
    const errBody = await tokenRes.text().catch(() => "")
    console.error("[fb-callback] token exchange failed:", tokenRes.status, errBody)
    return NextResponse.redirect(`${settingsUrl}?fb_error=token`)
  }
  const { access_token: shortToken } = await tokenRes.json() as { access_token: string }

  // 2. Exchange for long-lived user token (60 days)
  const llBody = new URLSearchParams({
    grant_type:          "fb_exchange_token",
    client_id:           process.env.META_APP_ID!,
    client_secret:       process.env.META_APP_SECRET!,
    fb_exchange_token:   shortToken,
  })

  const llRes = await fetch(`${GRAPH}/oauth/access_token`, {
    method:  "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body:    llBody.toString(),
  })

  const { access_token: userToken } = llRes.ok
    ? await llRes.json() as { access_token: string }
    : { access_token: shortToken }

  // 3. Fetch pages this user manages
  const pagesRes = await fetch(
    `${GRAPH}/me/accounts?fields=id,name,access_token,category,picture&access_token=${userToken}`
  )
  if (!pagesRes.ok) {
    const errBody = await pagesRes.text().catch(() => "")
    console.error("[fb-callback] pages fetch failed:", pagesRes.status, errBody)
    return NextResponse.redirect(`${settingsUrl}?fb_error=pages`)
  }
  const pagesJson = await pagesRes.json() as { data?: FacebookPage[]; error?: unknown }
  console.log("[fb-callback] pages response:", JSON.stringify(pagesJson).slice(0, 300))
  const pages = pagesJson.data ?? []

  if (pages.length === 0) {
    return NextResponse.redirect(`${settingsUrl}?fb_error=no_pages`)
  }

  // 4a. Single page → auto-connect
  if (pages.length === 1) {
    await savePage(clinicId, pages[0])
    const res = NextResponse.redirect(`${settingsUrl}?fb_connected=1`)
    clearOAuthCookies(res)
    return res
  }

  // 4b. Multiple pages → show picker
  const pagesList = pages.map(p => ({
    id:       p.id,
    name:     p.name,
    category: p.category ?? "",
    picture:  p.picture?.data?.url ?? "",
    token:    p.access_token,
  }))

  const res = NextResponse.redirect(`${settingsUrl}?fb_select=1`)
  clearOAuthCookies(res)

  res.cookies.set("fb_pages", JSON.stringify(pagesList), {
    httpOnly: true,
    secure:   process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge:   600,
    path:     "/",
  })
  res.cookies.set("fb_clinic_id", clinicId, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge:   600,
    path:     "/",
  })

  return res
}

async function savePage(clinicId: string, page: FacebookPage) {
  await db.$transaction([
    db.clinicChannel.upsert({
      where:  { clinicId_channel: { clinicId, channel: "FACEBOOK" } },
      create: {
        clinicId,
        channel:     "FACEBOOK",
        isActive:    true,
        pageId:      page.id,
        accessToken: page.access_token,
        connectedAt: new Date(),
        metadata:    { pageName: page.name, category: page.category },
      },
      update: {
        isActive:    true,
        pageId:      page.id,
        accessToken: page.access_token,
        connectedAt: new Date(),
        metadata:    { pageName: page.name, category: page.category },
      },
    }),
    db.clinic.update({
      where: { id: clinicId },
      data:  { facebookPageId: page.id, messengerActive: true },
    }),
  ])
}

function clearOAuthCookies(res: NextResponse) {
  res.cookies.set("fb_oauth_state", "", { maxAge: 0, path: "/" })
}
