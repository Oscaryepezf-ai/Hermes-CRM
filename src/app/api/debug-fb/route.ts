import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET() {
  const appId    = process.env.META_APP_ID          ?? "MISSING"
  const secret   = process.env.META_APP_SECRET      ?? "MISSING"
  const appUrl   = process.env.NEXT_PUBLIC_APP_URL  ?? "MISSING"
  const cleanUrl = appUrl.replace(/\/$/, "")

  return NextResponse.json({
    META_APP_ID:          appId,
    META_APP_SECRET_set:  secret !== "MISSING",
    META_APP_SECRET_len:  secret.length,
    NEXT_PUBLIC_APP_URL:  cleanUrl,
    redirect_uri:         `${cleanUrl}/api/auth/facebook/callback`,
  })
}
