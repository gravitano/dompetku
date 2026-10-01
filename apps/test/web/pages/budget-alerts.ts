import type { Locator, Page } from "@playwright/test";

/**
 * Page Object peringatan anggaran (E03-US03): toast setelah simpan pengeluaran
 * (UX-01/02), banner Beranda (UX-03), dan banner halaman Anggaran (UX-04).
 */
export class BudgetAlerts {
  readonly toast: Locator;
  readonly toastMessage: Locator;
  readonly toastLink: Locator;
  readonly toastClose: Locator;
  readonly homeBanner: Locator;
  readonly pageBanner: Locator;

  constructor(readonly page: Page) {
    this.toast = page.getByTestId("budget-alert-toast");
    this.toastMessage = page.getByTestId("budget-alert-toast-message");
    this.toastLink = page.getByTestId("budget-alert-toast-link");
    this.toastClose = page.getByTestId("budget-alert-toast-close");
    this.homeBanner = page.getByTestId("home-budget-alert-banner");
    this.pageBanner = page.getByTestId("budget-page-alert-banner");
  }

  /** Item sonner (`li[data-sonner-toast]`) yang memuat teks tsb. */
  sonnerItem(text: string | RegExp): Locator {
    return this.page.locator("[data-sonner-toast]").filter({ hasText: text });
  }
}
