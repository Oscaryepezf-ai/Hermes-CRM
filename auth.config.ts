import type { NextAuthConfig } from "next-auth";

export const authConfig: NextAuthConfig = {
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const pathname = nextUrl.pathname;

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
        return Response.redirect(new URL("/login", nextUrl));
      }

      if (isAuthRoute && isLoggedIn) {
        return Response.redirect(new URL("/dashboard", nextUrl));
      }

      return true;
    },
  },
  providers: [],
};
