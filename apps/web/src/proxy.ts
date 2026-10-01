import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

import {
  buildLoginUrl,
  isAuthPage,
  REQUEST_PATH_HEADER,
} from "~/modules/auth/callback-url";

/**
 * Proteksi route (optimistic check) — ITA §6.1, E01-US02 AC 6.
 *
 * Hanya mengecek keberadaan cookie session (tanpa query DB). Validasi session
 * sebenarnya tetap dilakukan di `(app)/layout.tsx` dan setiap action/query
 * lewat `requireUser()`.
 *
 * - Tanpa cookie → `/login?callbackUrl=<path asli>` (disanitasi, hanya path internal).
 * - Dengan cookie → path asli diteruskan lewat header `x-dompetku-path` agar
 *   `requireUserOrRedirect()` bisa menyertakan `callbackUrl` bila session
 *   ternyata sudah tidak valid.
 * - User yang sudah login membuka `/login` / `/register` diarahkan di halaman
 *   masing-masing (butuh validasi session ke DB, bukan hanya cookie).
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (isAuthPage(pathname)) return NextResponse.next();

  const path = `${pathname}${search}`;
  const sessionCookie = getSessionCookie(request);
  if (!sessionCookie) {
    return NextResponse.redirect(new URL(buildLoginUrl(path), request.url));
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(REQUEST_PATH_HEADER, path);
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  // Lewati API (auth & health), aset Next, dan file statis.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
