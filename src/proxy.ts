import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Proteksi route (optimistic check) — ITA §6.1.
 *
 * Hanya mengecek keberadaan cookie session (tanpa query DB). Validasi session
 * sebenarnya tetap dilakukan di `(app)/layout.tsx` dan setiap action/query
 * lewat `requireUser()`.
 *
 * TODO(E01-US02): detail redirect milik story login — mis. menyimpan
 * `callbackUrl`, dan mengarahkan user yang sudah login keluar dari /login & /register.
 */
const PUBLIC_PATHS = ["/login", "/register"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
  if (isPublic) return NextResponse.next();

  const sessionCookie = getSessionCookie(request);
  if (!sessionCookie) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  // Lewati API (auth & health), aset Next, dan file statis.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
