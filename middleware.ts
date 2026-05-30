import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const isLoggedIn = !!token;
  const pathname = req.nextUrl.pathname;

  const isProtectedRoute =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/pipeline") ||
    pathname.startsWith("/patients") ||
    pathname.startsWith("/appointments") ||
    pathname.startsWith("/settings") ||
    pathname.startsWith("/ai") ||
    pathname.startsWith("/dr-clinic");

  const isAuthRoute =
    pathname.startsWith("/login") ||
    pathname.startsWith("/register");

  if (isProtectedRoute && !isLoggedIn) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (isAuthRoute && isLoggedIn) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|public|demo).*)",
  ],
};
