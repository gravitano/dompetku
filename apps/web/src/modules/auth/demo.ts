/**
 * Akun demo publik — ditampilkan di halaman login hanya bila env server
 * `DEMO_MODE=true` (dibaca di server, tidak di-bundle ke client).
 * Akun dibuat oleh `pnpm db:seed` (prisma/seed.ts).
 */
export type DemoCredentials = { email: string; password: string };

type DemoEnv = Record<string, string | undefined>;

export const DEMO_CREDENTIALS: DemoCredentials = {
  email: "budi@example.com",
  password: "Password123",
};

export function isDemoMode(env: DemoEnv = process.env): boolean {
  return env.DEMO_MODE === "true";
}

/** Kredensial demo bila mode demo aktif, selain itu `null`. */
export function getDemoCredentials(
  env: DemoEnv = process.env,
): DemoCredentials | null {
  return isDemoMode(env) ? DEMO_CREDENTIALS : null;
}
