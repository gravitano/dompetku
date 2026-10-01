import type { Locator, Page } from "@playwright/test";

/** Page Object halaman /login (E01-US02). */
export class LoginPage {
  readonly title: Locator;
  readonly form: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly passwordToggle: Locator;
  readonly submitButton: Locator;
  readonly registerLink: Locator;
  readonly alert: Locator;
  readonly emailError: Locator;
  readonly passwordError: Locator;
  readonly demoInfo: Locator;
  readonly demoFillButton: Locator;

  constructor(readonly page: Page) {
    this.demoInfo = page.getByTestId("login-demo-info");
    this.demoFillButton = page.getByTestId("login-demo-fill");
    this.title = page.getByTestId("login-title");
    this.form = page.getByTestId("login-form");
    this.emailInput = page.getByTestId("login-email-input");
    this.passwordInput = page.getByTestId("login-password-input");
    this.passwordToggle = page.getByTestId("login-password-toggle");
    this.submitButton = page.getByTestId("login-submit-button");
    this.registerLink = page.getByTestId("login-register-link");
    this.alert = page.getByTestId("auth-alert");
    this.emailError = page.getByTestId("login-email-error");
    this.passwordError = page.getByTestId("login-password-error");
  }

  async goto(query = "") {
    await this.page.goto(`/login${query}`);
  }

  async fill(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
  }

  async submit() {
    await this.submitButton.click();
  }

  async login(email: string, password: string) {
    await this.fill(email, password);
    await this.submit();
  }

  /**
   * Submit lalu tunggu respons Server Action login selesai dan form aktif
   * kembali — untuk percobaan gagal berulang (pesan banner bisa sama).
   */
  async loginExpectingFailure(email: string, password: string) {
    await this.fill(email, password);
    const response = this.page.waitForResponse(
      (res) =>
        res.request().method() === "POST" &&
        new URL(res.url()).pathname === "/login",
    );
    await this.submit();
    await response;
    await this.alert.waitFor({ state: "visible" });
  }
}
