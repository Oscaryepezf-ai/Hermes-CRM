import type { NextAuthConfig } from "next-auth";

// Route → module key — used for role-based access in middleware
const ROUTE_MODULE_MAP: Record<string, string> = {
  "/dashboard":     "dashboard",
  "/pipeline":      "pipeline",
  "/agenda":        "agenda",
  "/patients":      "patients",
  "/dr-clinic":     "dr_clinic",
  "/ai":            "hermes_ai",
  "/settings":      "settings",
}

const ROLE_ALLOWED_MODULES: Record<string, string[]> = {
  ADMIN:        ["dashboard", "pipeline", "agenda", "patients", "dr_clinic", "hermes_ai", "settings"],
  DOCTOR:       ["dashboard", "pipeline", "agenda", "patients", "dr_clinic", "hermes_ai"],
  RECEPTIONIST: ["dashboard", "pipeline", "agenda", "patients"],
  // Legacy JWT values — users with old tokens before the role rename
  OWNER:   ["dashboard", "pipeline", "agenda", "patients", "dr_clinic", "hermes_ai", "settings"],
  DENTIST: ["dashboard", "pipeline", "agenda", "patients", "dr_clinic", "hermes_ai"],
  STAFF:   ["dashboard", "pipeline", "agenda", "patients"],
}

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
        pathname.startsWith("/agenda") ||
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

      if (isLoggedIn && auth?.user) {
        const user = auth.user as any;

        // Block deactivated accounts
        if (user.isActive === false) {
          return Response.redirect(new URL("/login?error=account_disabled", nextUrl));
        }

        // Check role-based module access
        const matchedModule = Object.entries(ROUTE_MODULE_MAP)
          .find(([route]) => pathname.startsWith(route))?.[1];

        if (matchedModule) {
          const role = user.role as string;
          const allowed = ROLE_ALLOWED_MODULES[role];
          // If role is unknown (e.g. stale JWT), allow through — don't loop
          if (allowed && !allowed.includes(matchedModule)) {
            return Response.redirect(new URL("/dashboard?error=unauthorized", nextUrl));
          }
        }
      }

      return true;
    },
  },
  providers: [],
};
