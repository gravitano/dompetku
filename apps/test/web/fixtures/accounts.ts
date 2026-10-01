/**
 * Akun uji E2E — dibuat oleh `pnpm db:seed` (prisma/seed.ts).
 * Password semua akun: Password123
 */
export const TEST_PASSWORD = "Password123";

export const TEST_ACCOUNTS = {
  /** User demo utama, punya contoh transaksi. */
  budi: {
    email: "budi@example.com",
    password: TEST_PASSWORD,
    name: "Budi Santoso",
  },
  /** User kedua — untuk uji isolasi data antar user. */
  ani: {
    email: "ani@example.com",
    password: TEST_PASSWORD,
    name: "Ani Wijaya",
  },
  /** Untuk skenario penguncian login (E01-US02). */
  lock: {
    email: "lock@example.com",
    password: TEST_PASSWORD,
    name: "Akun Terkunci",
  },
  /** User tanpa transaksi (empty state). */
  baru: {
    email: "baru@example.com",
    password: TEST_PASSWORD,
    name: "Pengguna Baru",
  },
} as const;

export type TestAccountKey = keyof typeof TEST_ACCOUNTS;
export type TestAccount = (typeof TEST_ACCOUNTS)[TestAccountKey];
