import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { APIError, createAuthMiddleware, isAPIError } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";

import { prisma } from "~/lib/prisma";
import {
  LOGIN_LOCKED_ERROR_CODE,
  loginLockout,
  readSignInEmail,
} from "~/modules/auth/login-lockout";
import { LOGIN_MESSAGES } from "~/modules/auth/schema";

/** Sesi berlaku 7 hari sejak aktivitas terakhir (E01-US02 AC 7). */
export const SESSION_EXPIRES_IN_SECONDS = 60 * 60 * 24 * 7;
/** Masa berlaku sesi diperpanjang paling sering 1x per hari saat aktif. */
export const SESSION_UPDATE_AGE_SECONDS = 60 * 60 * 24;

const SIGN_IN_EMAIL_PATH = "/sign-in/email";

/**
 * Konfigurasi better-auth (ITA §6.1).
 * - Email + password, hash scrypt bawaan, minimal 8 karakter.
 * - Database session 7 hari, diperpanjang otomatis (sliding) tiap 1 hari aktif.
 * - Rate limit per IP aktif untuk semua environment (hanya request HTTP
 *   `/api/auth/*`); aturan ketat di endpoint sign-in.
 * - Penguncian per email 5x gagal / 15 menit (E01-US02) lewat hook sign-in,
 *   berlaku untuk HTTP maupun `auth.api.signInEmail` (Server Action login).
 * - Registrasi hanya lewat Server Action `registerAction` (E01-US01) yang membuat
 *   user + kategori bawaan dalam satu transaksi, sehingga endpoint HTTP
 *   `/sign-up/email` dinonaktifkan (`auth.api.*` di server tidak terpengaruh).
 */
export const auth = betterAuth({
  appName: "DompetKu",
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  disabledPaths: ["/sign-up/email"],
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    autoSignIn: true,
  },
  session: {
    expiresIn: SESSION_EXPIRES_IN_SECONDS,
    updateAge: SESSION_UPDATE_AGE_SECONDS,
  },
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== SIGN_IN_EMAIL_PATH) return;
      const email = readSignInEmail(ctx.body);
      if (email && loginLockout.status(email).locked) {
        throw new APIError("TOO_MANY_REQUESTS", {
          code: LOGIN_LOCKED_ERROR_CODE,
          message: LOGIN_MESSAGES.locked,
        });
      }
    }),
    after: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== SIGN_IN_EMAIL_PATH) return;
      const email = readSignInEmail(ctx.body);
      if (!email) return;
      const returned = ctx.context.returned;
      if (isAPIError(returned)) {
        // 401 = email/password salah; error lain (validasi, sistem) tidak dihitung.
        if (returned.statusCode === 401) loginLockout.recordFailure(email);
        return;
      }
      loginLockout.reset(email);
    }),
  },
  rateLimit: {
    enabled: true,
    window: 60,
    max: 100,
    customRules: {
      "/sign-in/email": { window: 60, max: 10 },
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
