import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForTokens } from "@/lib/google-calendar/oauth";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const userId = searchParams.get("state");
  const error = searchParams.get("error");
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "";

  if (error) {
    return NextResponse.redirect(
      `${base}/settings/calendar?error=access_denied`
    );
  }

  if (!code || !userId) {
    return NextResponse.redirect(
      `${base}/settings/calendar?error=invalid_callback`
    );
  }

  try {
    await exchangeCodeForTokens(code, userId);
    return NextResponse.redirect(`${base}/settings/calendar?success=connected`);
  } catch {
    return NextResponse.redirect(
      `${base}/settings/calendar?error=token_exchange`
    );
  }
}
