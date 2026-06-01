import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { authConfig } from "./auth.config";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
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
          },
        });

        if (!user) return null;

        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) return null;

        db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } }).catch(() => {})

        return {
          id:           user.id,
          name:         user.name,
          email:        user.email,
          role:         user.role,
          avatarUrl:    user.avatarUrl,
          clinicId:     user.clinicId,
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
        token.role         = (user as any).role;
        token.avatarUrl    = (user as any).avatarUrl;
        token.isActive     = (user as any).isActive     ?? true;
        token.isSuperAdmin = (user as any).isSuperAdmin ?? false;
      }
      return token;
    },
    session({ session, token }) {
      if (token) {
        session.user.id        = token.id as string;
        session.user.clinicId  = token.clinicId as string;
        session.user.role      = token.role as any;
        session.user.avatarUrl = token.avatarUrl as string | null;
        (session.user as any).isActive     = (token.isActive     as boolean) ?? true;
        (session.user as any).isSuperAdmin = (token.isSuperAdmin as boolean) ?? false;
      }
      return session;
    },
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
