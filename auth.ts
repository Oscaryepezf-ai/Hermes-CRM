import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { authConfig } from "./auth.config";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const { handlers, auth: baseAuth, signIn, signOut } = NextAuth({
  ...authConfig,
  trustHost: true,
  providers: [
    Credentials({
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;

        const user = await db.user.findUnique({
          where: { email },
          select: {
            id: true,
            name: true,
            email: true,
            password: true,
            role: true,
            avatarUrl: true,
            clinicId: true,
            isActive: true,
            isSuperAdmin: true,
            clinic: { select: { suspendedAt: true } },
            userClinics: { select: { clinicId: true } },
          },
        });

        if (!user) return null;

        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) return null;

        if (!user.isSuperAdmin && user.clinic.suspendedAt) return null;

        db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } }).catch(() => {})

        const clinicIds = [...new Set([user.clinicId, ...user.userClinics.map(uc => uc.clinicId)])]

        return {
          id:           user.id,
          name:         user.name,
          email:        user.email,
          role:         user.role,
          avatarUrl:    user.avatarUrl,
          clinicId:     user.clinicId,
          clinicIds,
          isActive:     user.isActive,
          isSuperAdmin: user.isSuperAdmin,
        } as any;
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id           = user.id;
        token.clinicId     = (user as any).clinicId;
        token.clinicIds    = (user as any).clinicIds ?? [(user as any).clinicId];
        token.role         = (user as any).role;
        token.avatarUrl    = (user as any).avatarUrl;
        token.isActive     = (user as any).isActive     ?? true;
        token.isSuperAdmin = (user as any).isSuperAdmin ?? false;
      }
      return token;
    },
    session: authConfig.callbacks!.session,
    authorized: authConfig.callbacks!.authorized,
  },
  pages: {
    signIn: "/login",
    error:  "/login",
  },
  session: {
    strategy: "jwt",
    maxAge:   365 * 24 * 60 * 60,
  },
});

// Envuelve baseAuth() para sustituir session.user.clinicId por la "clínica
// activa" (cookie active_clinic_id) cuando el usuario tiene acceso a más de
// una clínica — ver lib/actions/clinic-switch.ts. Como todo el codebase
// importa `auth` desde este único archivo, este wrapper hace que cada
// Server Component/Action/Route Handler existente quede al tanto del
// cambio de clínica sin tocar ninguno de ellos.
export async function auth() {
  const session = await baseAuth();
  if (!session?.user) return session;

  const activeClinicId = (await cookies()).get("active_clinic_id")?.value;
  const accessibleIds: string[] = (session.user as any).clinicIds ?? [session.user.clinicId];

  if (activeClinicId && accessibleIds.includes(activeClinicId)) {
    session.user.clinicId = activeClinicId;
  }

  return session;
}
