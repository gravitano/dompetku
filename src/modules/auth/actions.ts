"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { fail, fromZodError, type ActionResult } from "~/lib/action-result";
import { auth } from "~/lib/auth";
import { createRateLimiter, getClientIp } from "~/lib/rate-limit";

import { createAccountWithDefaults, EmailTakenError } from "./registration";
import { REGISTER_MESSAGES, registerSchema } from "./schema";

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
      return fail("INTERNAL_ERROR", REGISTER_MESSAGES.rateLimited);
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
