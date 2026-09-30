import type { Locator, Page } from "@playwright/test";

export type RegisterData = {
  name: string;
  email: string;
  password: string;
  confirmPassword?: string;
};

/** Page Object halaman /register (E01-US01). */
export class RegisterPage {
  readonly title: Locator;
  readonly nameInput: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly passwordToggle: Locator;
  readonly confirmInput: Locator;
  readonly submitButton: Locator;
  readonly loginLink: Locator;
  readonly nameError: Locator;
  readonly emailError: Locator;
  readonly emailLoginLink: Locator;
  readonly passwordError: Locator;
  readonly confirmError: Locator;
  readonly errorBanner: Locator;

  constructor(readonly page: Page) {
    this.title = page.getByTestId("register-title");
    this.nameInput = page.getByTestId("register-name-input");
    this.emailInput = page.getByTestId("register-email-input");
    this.passwordInput = page.getByTestId("register-password-input");
    this.passwordToggle = page.getByTestId("register-password-toggle");
    this.confirmInput = page.getByTestId("register-password-confirm-input");
    this.submitButton = page.getByTestId("register-submit-button");
    this.loginLink = page.getByTestId("register-login-link");
    this.nameError = page.getByTestId("register-name-error");
    this.emailError = page.getByTestId("register-email-error");
    this.emailLoginLink = page.getByTestId("register-email-login-link");
    this.passwordError = page.getByTestId("register-password-error");
    this.confirmError = page.getByTestId("register-password-confirm-error");
    this.errorBanner = page.getByTestId("register-error-banner");
  }

  passwordRule(key: "length" | "mix") {
    return this.page.getByTestId(`register-password-rule-${key}`);
  }

  async goto() {
    await this.page.goto("/register");
  }

  async fill({ name, email, password, confirmPassword }: RegisterData) {
    await this.nameInput.fill(name);
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.confirmInput.fill(confirmPassword ?? password);
  }

  async submit() {
    await this.submitButton.click();
  }

  async register(data: RegisterData) {
    await this.fill(data);
    await this.submit();
  }
}
