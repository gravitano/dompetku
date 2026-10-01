import "server-only";

import { cookies } from "next/headers";

/** Nama cookie yang dibaca saat fault injection aktif. */
export const FAULT_COOKIE = "e2e-fault";

/**
 * Simulasi kegagalan server untuk skenario E2E `@error-handling` yang tidak
 * bisa dibuat deterministik dari browser (mis. "server tidak dapat dihubungi"
 * saat memuat halaman). Hanya aktif bila env server
 * `E2E_FAULT_INJECTION=true` — di-set oleh `webServer` Playwright, tidak pernah
 * di produksi. Test mengaktifkan satu kegagalan dengan cookie
 * `e2e-fault=<nama>[,<nama>]`.
 */
export async function isFaultInjected(name: string): Promise<boolean> {
  if (process.env.E2E_FAULT_INJECTION !== "true") return false;
  const value = (await cookies()).get(FAULT_COOKIE)?.value ?? "";
  return value.split(",").includes(name);
}
