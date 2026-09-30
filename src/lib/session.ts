import "server-only";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import { auth, type SessionUser } from "~/lib/auth";

export const LOGIN_PATH = "/login";

/**
 * Ambil user dari session aktif (atau null). Di-cache per request.
 * Pakai di Server Component / Server Action / Route Handler.
 */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user ?? null;
});

/** Error yang dilempar `requireUser()` saat tidak ada session. */
export class UnauthorizedError extends Error {
  readonly code = "UNAUTHORIZED" as const;
  constructor(message = "Sesi berakhir. Silakan masuk kembali.") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

/**
 * Wajib login — untuk Server Action & query. Lempar `UnauthorizedError`
 * bila belum login. Selalu ambil `userId` dari sini, bukan dari input client.
 */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new UnauthorizedError();
  return user;
}

/**
 * Wajib login — untuk page/layout (Server Component). Redirect ke /login
 * bila belum login.
 */
export async function requireUserOrRedirect(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect(LOGIN_PATH);
  return user;
}
