import { test as base } from "@playwright/test";

import {
  TEST_ACCOUNTS,
  type TestAccount,
  type TestAccountKey,
} from "./accounts";
import { TestDb, uniqueEmail } from "./db";
import { LoginPage } from "../pages/login-page";
import { RegisterPage } from "../pages/register-page";

type Fixtures = {
  loginPage: LoginPage;
  registerPage: RegisterPage;
  /** Login lewat API better-auth (cookie session tersimpan di context). */
  loginAs: (account: TestAccountKey | TestAccount) => Promise<void>;
};

type WorkerFixtures = {
  /** Akses read-only ke database (assertion yang tidak terlihat di UI). */
  db: TestDb;
};

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
  loginAs: async ({ page }, use) => {
    await use(async (account) => {
      const { email, password } =
        typeof account === "string" ? TEST_ACCOUNTS[account] : account;
      const response = await page.request.post("/api/auth/sign-in/email", {
        data: { email, password },
      });
      if (!response.ok()) {
        throw new Error(`Login ${email} gagal: ${response.status()}`);
      }
    });
  },
});

export { expect } from "@playwright/test";
export { TEST_ACCOUNTS, uniqueEmail };
