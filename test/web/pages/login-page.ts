import type { Locator, Page } from "@playwright/test";

/** Page Object halaman /login. Locator form ditambah di story E01-US02. */
export class LoginPage {
  readonly title: Locator;
  readonly registerLink: Locator;

  constructor(readonly page: Page) {
    this.title = page.getByTestId("login-title");
    this.registerLink = page.getByTestId("login-register-link");
  }

  async goto() {
    await this.page.goto("/login");
  }
}
