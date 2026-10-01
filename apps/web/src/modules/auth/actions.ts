"use server";

import { isAPIError } from "better-auth/api";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { fail, fromZodError, ok, type ActionResult } from "~/lib/action-result";
import { auth } from "~/lib/auth";
import { createRateLimiter, getClientIp } from "~/lib/rate-limit";

import { sanitizeCallbackUrl } from "./callback-url";
import { LOGIN_LOCKED_ERROR_CODE } from "./login-lockout";
import { createAccountWithDefaults, EmailTakenError } from "./registration";
import {
  LOGIN_MESSAGES,
  loginSchema,
  REGISTER_MESSAGES,
  registerSchema,
} from "./schema";

/** Beranda dengan penanda toast sapaan (`~/components/auth/welcome-toast`). */
const REGISTER_SUCCESS_PATH = "/?welcome=1";
/** Fallback bila akun dibuat tetapi auto-login gagal. */
const REGISTER_LOGIN_FALLBACK_PATH = "/login?registered=1";

/**
 * 5 percobaan registrasi / menit / IP. Server Action tidak melewati rate
 * limiter better-auth, jadi dibatasi di sini. Hanya aktif di production agar
 * dev & E2E lokal (banyak registrasi dari 1 IP) tidak terhambat.
 */
const registerLimiter = createRateLimiter({ max: 5, windowMs: 60_000 });

/**
 * Registrasi akun (E01-US01): validasi → buat user + kategori bawaan (atomic)
 * → auto-login → redirect ke Beranda. Hanya mengembalikan nilai bila gagal;
 * saat berhasil, fungsi ini melakukan `redirect()`.
 */
export async function registerAction(input: unknown): Promise<ActionResult> {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  const { name, email, password } = parsed.data;

  const requestHeaders = await headers();

  if (process.env.NODE_ENV === "production") {
    const limit = registerLimiter.hit(
      `register:${getClientIp(requestHeaders)}`,
    );
    if (!limit.allowed) {
      return fail("RATE_LIMITED", REGISTER_MESSAGES.rateLimited);
    }
  }

  try {
    await createAccountWithDefaults({ name, email, password });
  } catch (error) {
    if (error instanceof EmailTakenError) {
      return fail("CONFLICT", REGISTER_MESSAGES.emailTaken, [
        { field: "email", message: REGISTER_MESSAGES.emailTaken },
      ]);
    }
    console.error("[registerAction] gagal membuat akun", error);
    return fail("INTERNAL_ERROR", REGISTER_MESSAGES.systemError);
  }

  let signedIn = false;
  try {
    // Plugin `nextCookies` menulis cookie session ke response Server Action.
    await auth.api.signInEmail({
      body: { email, password },
      headers: requestHeaders,
    });
    signedIn = true;
  } catch (error) {
    console.error("[registerAction] auto-login gagal", error);
  }

  redirect(signedIn ? REGISTER_SUCCESS_PATH : REGISTER_LOGIN_FALLBACK_PATH);
}

/**
 * 10 percobaan login / menit / IP (production) — setara aturan better-auth
 * untuk HTTP `/sign-in/email`, karena Server Action tidak melewati rate
 * limiter bawaan tsb. Penguncian per email (5x / 15 menit) ada di hook
 * better-auth (`~/modules/auth/login-lockout`).
 */
const loginIpLimiter = createRateLimiter({ max: 10, windowMs: 60_000 });

const loginActionSchema = loginSchema.extend({
  callbackUrl: z.string().optional().catch(undefined),
});

function errorCodeOf(error: { body?: unknown }): unknown {
  const body = error.body;
  return typeof body === "object" && body !== null
    ? (body as { code?: unknown }).code
    : undefined;
}

/**
 * Login (E01-US02): validasi → `auth.api.signInEmail` (cookie session via
 * plugin `nextCookies`) → redirect ke `callbackUrl` yang sudah disanitasi
 * (default Beranda). Hanya mengembalikan nilai bila gagal.
 */
export async function loginAction(input: unknown): Promise<ActionResult> {
  const parsed = loginActionSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  const { email, password, callbackUrl } = parsed.data;

  const requestHeaders = await headers();

  if (process.env.NODE_ENV === "production") {
    const limit = loginIpLimiter.hit(`login:${getClientIp(requestHeaders)}`);
    if (!limit.allowed) {
      return fail("RATE_LIMITED", LOGIN_MESSAGES.rateLimited);
    }
  }

  try {
    await auth.api.signInEmail({
      body: { email, password },
      headers: requestHeaders,
    });
  } catch (error) {
    if (isAPIError(error)) {
      if (errorCodeOf(error) === LOGIN_LOCKED_ERROR_CODE) {
        return fail("RATE_LIMITED", LOGIN_MESSAGES.locked);
      }
      if (error.statusCode === 401) {
        return fail("UNAUTHORIZED", LOGIN_MESSAGES.invalidCredentials);
      }
    }
    console.error("[loginAction] gagal login", error);
    return fail("INTERNAL_ERROR", LOGIN_MESSAGES.systemError);
  }

  redirect(sanitizeCallbackUrl(callbackUrl));
}

/**
 * Logout (E01-US02 AC 10): cabut session di database & hapus cookie.
 * Navigasi ke `/login?logout=1` dilakukan client dengan full page load agar
 * router cache (data halaman sebelumnya) ikut terbuang (AC 11).
 */
export async function logoutAction(): Promise<ActionResult> {
  try {
    await auth.api.signOut({ headers: await headers() });
    return ok();
  } catch (error) {
    console.error("[logoutAction] gagal logout", error);
    return fail("INTERNAL_ERROR", LOGIN_MESSAGES.logoutFailed);
  }
}
