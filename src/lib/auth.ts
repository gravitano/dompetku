import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";

import { prisma } from "~/lib/prisma";

const SEVEN_DAYS_IN_SECONDS = 60 * 60 * 24 * 7;
const ONE_DAY_IN_SECONDS = 60 * 60 * 24;

/**
 * Konfigurasi better-auth (ITA §6.1).
 * - Email + password, hash scrypt bawaan, minimal 8 karakter.
 * - Database session 7 hari, diperpanjang otomatis (sliding) tiap 1 hari aktif.
 * - Rate limit aktif untuk semua environment; aturan ketat di endpoint auth.
 *   Penguncian per-email (5x gagal / 15 menit) milik story E01-US02.
 */
export const auth = betterAuth({
  appName: "DompetKu",
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    autoSignIn: true,
  },
  session: {
    expiresIn: SEVEN_DAYS_IN_SECONDS,
    updateAge: ONE_DAY_IN_SECONDS,
  },
  rateLimit: {
    enabled: true,
    window: 60,
    max: 100,
    customRules: {
      "/sign-in/email": { window: 60, max: 10 },
      "/sign-up/email": { window: 60, max: 5 },
    },
  },
  advanced: {
    useSecureCookies: process.env.NODE_ENV === "production",
  },
  // nextCookies harus plugin terakhir agar Set-Cookie ikut di Server Actions.
  plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
export type SessionUser = Session["user"];
