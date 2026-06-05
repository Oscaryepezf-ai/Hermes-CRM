import { NextRequest, NextResponse } from "next/server"
import { auth } from "../../../../../../auth"
import { randomBytes } from "crypto"

export async function GET(request: NextRequest) {
  const session = await auth()

  console.log("[fb-connect] session user:", session?.user?.email ?? "none", "clinicId:", session?.user?.clinicId ?? "none")
  console.log("[fb-connect] META_APP_ID:", process.env.META_APP_ID ?? "MISSING")
  console.log("[fb-connect] NEXT_PUBLIC_APP_URL:", process.env.NEXT_PUBLIC_APP_URL ?? "MISSING")

  if (!session?.user?.clinicId) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  if (!process.env.META_APP_ID) {
    console.error("[fb-connect] META_APP_ID is not set!")
    return NextResponse.redirect(new URL("/settings/channels?fb_error=invalid", request.url))
  }

  const nonce = randomBytes(16).toString("hex")
  const state = Buffer.from(JSON.stringify({ clinicId: session.user.clinicId, nonce })).toString("base64url")

  const baseUrl    = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "")
  const redirectUri = `${baseUrl}/api/auth/facebook/callback`

  const params = new URLSearchParams({
    client_id:     process.env.META_APP_ID,
    redirect_uri:  redirectUri,
    scope:         "pages_show_list,pages_messaging,pages_manage_metadata",
    response_type: "code",
    state,
  })

  const facebookAuthUrl = `https://www.facebook.com/v18.0/dialog/oauth?${params}`
  console.log("[fb-connect] redirecting to Facebook, redirect_uri:", redirectUri)

  const res = NextResponse.redirect(facebookAuthUrl)
  res.cookies.set("fb_oauth_state", state, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge:   600,
    path:     "/",
  })

  return res
}
