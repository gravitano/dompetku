import type { Locator, Page } from "@playwright/test";

import { AppShell } from "./app-shell";

/** Page Object halaman Anggaran + form Atur Anggaran (E03-US01). */
export class BudgetsPage {
  readonly shell: AppShell;
  readonly root: Locator;
  readonly title: Locator;
  readonly monthPrev: Locator;
  readonly monthNext: Locator;
  readonly monthLabel: Locator;
  readonly readonlyLabel: Locator;
  readonly total: Locator;
  readonly list: Locator;
  readonly emptyState: Locator;
  readonly copyButton: Locator;
  readonly skeleton: Locator;
  readonly sheet: Locator;
  readonly formTitle: Locator;
  readonly amountInput: Locator;
  readonly amountError: Locator;
  readonly submitButton: Locator;
  readonly cancelButton: Locator;
  readonly formAlert: Locator;
  readonly deleteButton: Locator;
  readonly deleteDialog: Locator;
  readonly deleteTitle: Locator;
  readonly confirmDelete: Locator;
  readonly confirmCancel: Locator;

  constructor(readonly page: Page) {
    this.shell = new AppShell(page);
    this.root = page.getByTestId("budgets-page");
    this.title = page.getByTestId("page-title");
    this.monthPrev = page.getByTestId("budget-month-prev");
    this.monthNext = page.getByTestId("budget-month-next");
    this.monthLabel = page.getByTestId("budget-month-label");
    this.readonlyLabel = page.getByTestId("budget-readonly-label");
    this.total = page.getByTestId("budget-total");
    this.list = page.getByTestId("budget-list");
    this.emptyState = page.getByTestId("budget-empty-state");
    this.copyButton = page.getByTestId("budget-copy-previous-button");
    this.skeleton = page.getByTestId("budgets-skeleton");
    this.sheet = page.getByTestId("budget-form-sheet");
    this.formTitle = page.getByTestId("budget-form-title");
    this.amountInput = page.getByTestId("budget-amount-input");
    this.amountError = page.getByTestId("budget-amount-error");
    this.submitButton = page.getByTestId("budget-submit-button");
    this.cancelButton = page.getByTestId("budget-cancel-button");
    this.formAlert = page.getByTestId("budget-form-alert");
    this.deleteButton = page.getByTestId("budget-delete-button");
    this.deleteDialog = page.getByTestId("budget-delete-dialog");
    this.deleteTitle = page.getByTestId("budget-delete-title");
    this.confirmDelete = page.getByTestId("confirm-delete-button");
    this.confirmCancel = page.getByTestId("confirm-cancel-button");
  }

  /** Buka `/budgets` (opsional `?month=YYYY-MM`) dan tunggu bulan tsb tampil. */
  async goto(month?: string) {
    await this.page.goto(month ? `/budgets?month=${month}` : "/budgets");
    await this.root.waitFor();
    if (month) await this.waitForMonth(month);
  }

  /** Tunggu data bulan `month` ("YYYY-MM") selesai dimuat. */
  async waitForMonth(month: string) {
    await this.page
      .locator(
        `[data-testid="budgets-page"][data-month="${month}"][aria-busy="false"]`,
      )
      .waitFor();
  }

  async next(month: string) {
    await this.monthNext.click();
    await this.waitForMonth(month);
  }

  async prev(month: string) {
    await this.monthPrev.click();
    await this.waitForMonth(month);
  }

  /** Baris kategori, mis. "makan-minum". */
  row(slug: string): Locator {
    return this.page.getByTestId(`budget-row-${slug}`);
  }

  amount(slug: string): Locator {
    return this.page.getByTestId(`budget-row-${slug}-amount`);
  }

  archivedLabel(slug: string): Locator {
    return this.page.getByTestId(`budget-row-${slug}-archived`);
  }

  /** Nama kategori di daftar, berurutan. */
  async names(): Promise<string[]> {
    return this.list.getByTestId("budget-row-name").allTextContents();
  }

  async open(slug: string) {
    await this.row(slug).click();
    await this.sheet.waitFor({ state: "visible" });
  }

  /** Tap kategori, isi nominal (kosongkan dulu), lalu Simpan. */
  async setAmount(slug: string, amount: string) {
    await this.open(slug);
    await this.amountInput.fill(amount);
    await this.submitButton.click();
  }

  /** Toast sonner dengan teks tertentu. */
  toast(text: string): Locator {
    return this.page.locator("[data-sonner-toast]").filter({ hasText: text });
  }
}
