import { test as base } from "@playwright/test";

import {
  TEST_ACCOUNTS,
  type TestAccount,
  type TestAccountKey,
} from "./accounts";
import { LoginPage } from "../pages/login-page";

type Fixtures = {
  loginPage: LoginPage;
  /** Login lewat API better-auth (cookie session tersimpan di context). */
  loginAs: (account: TestAccountKey | TestAccount) => Promise<void>;
};

export const test = base.extend<Fixtures>({
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
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
export { TEST_ACCOUNTS };
