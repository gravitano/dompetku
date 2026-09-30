/**
 * Penguncian login per email (E01-US02 AC 4): setelah 5 kali gagal dalam
 * 15 menit untuk email yang sama, percobaan berikutnya ditolak selama 15 menit
 * — termasuk dengan password yang benar.
 *
 * - Dihitung per email (lowercase), termasuk email yang tidak terdaftar agar
 *   respons tidak membocorkan keberadaan akun.
 * - Login berhasil sebelum batas me-reset penghitung.
 * - In-memory: cukup karena 1 container app per environment (ITA §8).
 *   Dipasang sebagai hook better-auth di `~/lib/auth` sehingga berlaku untuk
 *   `loginAction` maupun endpoint HTTP `/api/auth/sign-in/email`.
 */

export const LOGIN_MAX_FAILURES = 5;
export const LOGIN_LOCK_WINDOW_MS = 15 * 60 * 1000;
/** Kode `APIError` better-auth saat email sedang terkunci. */
export const LOGIN_LOCKED_ERROR_CODE = "LOGIN_LOCKED";

export type LockStatus = {
  locked: boolean;
  /** Milidetik sampai kunci dibuka (0 bila tidak terkunci). */
  retryAfterMs: number;
};

export type LoginLockout = {
  status: (email: string) => LockStatus;
  recordFailure: (email: string) => LockStatus;
  reset: (email: string) => void;
  clear: () => void;
};

type Entry = {
  failures: number;
  /** Akhir window penghitungan (dimulai dari kegagalan pertama). */
  windowEndsAt: number;
  lockedUntil: number;
};

export function normalizeLoginEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function createLoginLockout({
  maxFailures = LOGIN_MAX_FAILURES,
  windowMs = LOGIN_LOCK_WINDOW_MS,
  now = Date.now,
}: {
  maxFailures?: number;
  windowMs?: number;
  now?: () => number;
} = {}): LoginLockout {
  const entries = new Map<string, Entry>();

  function prune(time: number) {
    for (const [key, entry] of entries) {
      if (entry.windowEndsAt <= time && entry.lockedUntil <= time) {
        entries.delete(key);
      }
    }
  }

  function statusOf(entry: Entry | undefined, time: number): LockStatus {
    if (entry && entry.lockedUntil > time) {
      return { locked: true, retryAfterMs: entry.lockedUntil - time };
    }
    return { locked: false, retryAfterMs: 0 };
  }

  return {
    status(email) {
      return statusOf(entries.get(normalizeLoginEmail(email)), now());
    },
    recordFailure(email) {
      const key = normalizeLoginEmail(email);
      const time = now();
      if (entries.size > 10_000) prune(time);

      let entry = entries.get(key);
      if (!entry || (entry.windowEndsAt <= time && entry.lockedUntil <= time)) {
        entry = { failures: 0, windowEndsAt: time + windowMs, lockedUntil: 0 };
        entries.set(key, entry);
      }
      entry.failures += 1;
      if (entry.failures >= maxFailures && entry.lockedUntil <= time) {
        entry.lockedUntil = time + windowMs;
      }
      return statusOf(entry, time);
    },
    reset(email) {
      entries.delete(normalizeLoginEmail(email));
    },
    clear() {
      entries.clear();
    },
  };
}

const globalForLockout = globalThis as unknown as {
  __dompetkuLoginLockout?: LoginLockout;
};

/**
 * Instance tunggal yang dipakai hook sign-in better-auth. Disimpan di
 * `globalThis` agar tetap satu walau modul dimuat di beberapa bundle route
 * (route handler `/api/auth` & Server Action) atau saat HMR.
 */
export const loginLockout: LoginLockout =
  globalForLockout.__dompetkuLoginLockout ??
  (globalForLockout.__dompetkuLoginLockout = createLoginLockout());

/** Ambil email dari body request sign-in (bila ada). */
export function readSignInEmail(body: unknown): string | null {
  if (typeof body !== "object" || body === null) return null;
  const email = (body as { email?: unknown }).email;
  if (typeof email !== "string") return null;
  const normalized = normalizeLoginEmail(email);
  return normalized || null;
}
