import { test as base } from "@playwright/test";

import {
  TEST_ACCOUNTS,
  TEST_PASSWORD,
  type TestAccount,
  type TestAccountKey,
} from "./accounts";
import { TestDb, uniqueEmail, type CreatedUser } from "./db";
import { LoginPage } from "../pages/login-page";
import { RegisterPage } from "../pages/register-page";

type Fixtures = {
  loginPage: LoginPage;
  registerPage: RegisterPage;
  /**
   * Login lewat API better-auth (cookie session tersimpan di context).
   * Tiap panggilan memakai `X-Forwarded-For` acak agar rate limiter per IP
   * bawaan better-auth (10/menit untuk `/sign-in/email`) tidak terpicu oleh
   * banyak test paralel dari mesin yang sama.
   */
  loginAs: (
    account: TestAccountKey | TestAccount | CreatedUser,
  ) => Promise<void>;
  /**
   * Buat akun baru terisolasi (kategori bawaan, tanpa transaksi), mis.
   * `createUser("budi")` → `budi+<project>-<ts>-<rand>@example.com`.
   * Aman untuk test paralel yang menghitung total/jumlah transaksi.
   */
  createUser: (prefix?: string, name?: string) => Promise<CreatedUser>;
};

type WorkerFixtures = {
  /** Akses read-only ke database (assertion yang tidak terlihat di UI). */
  db: TestDb;
};

/** IP acak dari blok benchmark RFC 2544 (198.18.0.0/15). */
export function randomTestIp(): string {
  const octet = () => Math.floor(Math.random() * 254) + 1;
  return `198.18.${octet()}.${octet()}`;
}

export const test = base.extend<Fixtures, WorkerFixtures>({
  db: [
    async ({}, use) => {
      const db = new TestDb();
      await use(db);
      await db.close();
    },
    { scope: "worker" },
  ],
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
  registerPage: async ({ page }, use) => {
    await use(new RegisterPage(page));
  },
  createUser: async ({ db }, use, testInfo) => {
    await use((prefix = "budi", name = "Budi Santoso") =>
      db.createUser({
        email: uniqueEmail(prefix, testInfo.project.name),
        name,
        password: TEST_PASSWORD,
      }),
    );
  },
  loginAs: async ({ page }, use) => {
    await use(async (account) => {
      const { email, password } =
        typeof account === "string" ? TEST_ACCOUNTS[account] : account;
      const response = await page.request.post("/api/auth/sign-in/email", {
        data: { email, password },
        headers: { "x-forwarded-for": randomTestIp() },
      });
      if (!response.ok()) {
        throw new Error(`Login ${email} gagal: ${response.status()}`);
      }
    });
  },
});

export { expect } from "@playwright/test";
export { TEST_ACCOUNTS, TEST_PASSWORD } from "./accounts";
export { uniqueEmail };
export type { CreatedUser } from "./db";
