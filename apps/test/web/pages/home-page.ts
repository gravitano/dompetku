import type { Locator, Page } from "@playwright/test";

/**
 * Page Object Beranda — dashboard ringkasan bulanan (E04-US01). Selector
 * mengikuti testing.md E04-US01; `summary-income-total`,
 * `summary-expense-total`, `recent-transaction-item`, dan
 * `recent-transactions-empty` juga dipakai spec E02.
 */
export class HomePage {
  readonly title: Locator;
  readonly period: Locator;
  readonly incomeTotal: Locator;
  readonly expenseTotal: Locator;
  readonly balance: Locator;
  readonly budgetCard: Locator;
  readonly budgetText: Locator;
  readonly budgetPercent: Locator;
  readonly budgetProgress: Locator;
  readonly budgetRemaining: Locator;
  readonly budgetLink: Locator;
  readonly budgetSetupCta: Locator;
  readonly recentItems: Locator;
  readonly seeAll: Locator;
  /** Empty state pengguna baru (tanpa transaksi sama sekali). */
  readonly recentEmpty: Locator;
  readonly emptyMessage: Locator;
  readonly emptyCta: Locator;
  readonly loadError: Locator;
  readonly retryButton: Locator;
  readonly alerts: Locator;
  readonly fab: Locator;

  constructor(readonly page: Page) {
    this.title = page.getByTestId("page-title");
    this.period = page.getByTestId("dashboard-period");
    this.incomeTotal = page.getByTestId("summary-income-total");
    this.expenseTotal = page.getByTestId("summary-expense-total");
    this.balance = page.getByTestId("summary-balance");
    this.budgetCard = page.getByTestId("budget-summary-card");
    this.budgetText = page.getByTestId("budget-summary-text");
    this.budgetPercent = page.getByTestId("budget-summary-percent");
    this.budgetProgress = page.getByTestId("budget-summary-progress");
    this.budgetRemaining = page.getByTestId("budget-summary-remaining");
    this.budgetLink = page.getByTestId("budget-summary-link");
    this.budgetSetupCta = page.getByTestId("budget-setup-cta");
    this.recentItems = page.getByTestId("recent-transaction-item");
    this.seeAll = page.getByTestId("recent-transactions-see-all");
    this.recentEmpty = page.getByTestId("recent-transactions-empty");
    this.emptyMessage = page.getByTestId("dashboard-empty-message");
    this.emptyCta = page.getByTestId("dashboard-empty-cta");
    this.loadError = page.getByTestId("dashboard-load-error");
    this.retryButton = page.getByTestId("dashboard-retry-button");
    this.alerts = page.getByTestId("dashboard-alerts");
    this.fab = page.getByTestId("fab-add-transaction");
  }

  async goto() {
    await this.page.goto("/");
  }

  /** Total pemasukan bulan ini sebagai angka Rupiah. */
  async incomeTotalValue(): Promise<number> {
    return Number(await this.incomeTotal.getAttribute("data-value"));
  }

  /** Total pengeluaran bulan ini sebagai angka Rupiah. */
  async expenseTotalValue(): Promise<number> {
    return Number(await this.expenseTotal.getAttribute("data-value"));
  }

  /** Baris transaksi dengan catatan tertentu. */
  item(note: string): Locator {
    return this.recentItems.filter({
      has: this.page.getByTestId("transaction-note").getByText(note, {
        exact: true,
      }),
    });
  }

  /** Catatan (atau nama kategori) transaksi terbaru, urut tampilan. */
  async recentNotes(): Promise<string[]> {
    return this.recentItems.getByTestId("transaction-note").allInnerTexts();
  }
}

/** "YYYY-MM-DD" hari ini (+ offset hari) menurut kalender Asia/Jakarta. */
export function jakartaDate(offsetDays = 0, now = new Date()): string {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  const date = new Date(`${today}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}
