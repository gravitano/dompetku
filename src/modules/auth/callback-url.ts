/**
 * Helper `callbackUrl` untuk alur login (E01-US02 AC 6). Isomorfik & tanpa
 * dependensi server: dipakai `src/proxy.ts`, halaman `/login`, `loginAction`,
 * dan `requireUserOrRedirect()`.
 */

export const LOGIN_PATH = "/login";
export const REGISTER_PATH = "/register";
/** Tujuan default setelah login (Beranda). */
export const DEFAULT_AFTER_LOGIN_PATH = "/";
export const CALLBACK_URL_PARAM = "callbackUrl";
/** Query param banner "Anda telah keluar" di `/login`. */
export const LOGOUT_PARAM = "logout";
/** Query param banner "Akun berhasil dibuat" (fallback registrasi E01-US01). */
export const REGISTERED_PARAM = "registered";
/**
 * Header internal berisi path + query request asli. Diisi (dan selalu
 * ditimpa) oleh `src/proxy.ts`, dibaca `requireUserOrRedirect()`.
 */
export const REQUEST_PATH_HEADER = "x-dompetku-path";

const AUTH_PAGES = [LOGIN_PATH, REGISTER_PATH];
const MAX_CALLBACK_URL_LENGTH = 2048;
// Origin dummy untuk mem-parse path relatif.
const BASE_ORIGIN = "http://dompetku.invalid";

function matchesPath(pathname: string, base: string): boolean {
  return pathname === base || pathname.startsWith(`${base}/`);
}

/** Halaman publik khusus tamu: login & registrasi. */
export function isAuthPage(pathname: string): boolean {
  return AUTH_PAGES.some((page) => matchesPath(pathname, page));
}

/**
 * Kembalikan `callbackUrl` yang aman: hanya path internal (`/…`) dan bukan
 * halaman login/registrasi atau `/api`. Nilai lain (URL absolut, `//host`,
 * `/\host`, skema `javascript:`, karakter kontrol) → Beranda, sehingga tidak
 * bisa dipakai untuk open redirect.
 */
export function sanitizeCallbackUrl(value: unknown): string {
  if (typeof value !== "string") return DEFAULT_AFTER_LOGIN_PATH;
  if (!value.startsWith("/") || value.length > MAX_CALLBACK_URL_LENGTH) {
    return DEFAULT_AFTER_LOGIN_PATH;
  }
  // Backslash & karakter kontrol bisa ditafsirkan browser sebagai `//host`.
  if (value.startsWith("//") || /[\\\u0000-\u001f\u007f]/.test(value)) {
    return DEFAULT_AFTER_LOGIN_PATH;
  }

  let url: URL;
  try {
    url = new URL(value, BASE_ORIGIN);
  } catch {
    return DEFAULT_AFTER_LOGIN_PATH;
  }
  if (url.origin !== BASE_ORIGIN) return DEFAULT_AFTER_LOGIN_PATH;
  if (isAuthPage(url.pathname) || matchesPath(url.pathname, "/api")) {
    return DEFAULT_AFTER_LOGIN_PATH;
  }
  return `${url.pathname}${url.search}${url.hash}`;
}

/**
 * URL halaman login dengan `callbackUrl` (bila bukan Beranda), mis.
 * `/login?callbackUrl=%2Fbudgets`.
 */
export function buildLoginUrl(callbackUrl?: string | null): string {
  const target = sanitizeCallbackUrl(callbackUrl);
  if (target === DEFAULT_AFTER_LOGIN_PATH) return LOGIN_PATH;
  const params = new URLSearchParams({ [CALLBACK_URL_PARAM]: target });
  return `${LOGIN_PATH}?${params.toString()}`;
}
