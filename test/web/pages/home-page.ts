import type { Locator, Page } from "@playwright/test";

/**
 * Page Object Beranda (versi minimal E02-US01: total pengeluaran bulan ini +
 * transaksi terbaru). Selector mengikuti E04-US01 agar bisa dipakai ulang.
 */
export class HomePage {
  readonly expenseTotal: Locator;
  readonly recentItems: Locator;
  readonly recentEmpty: Locator;

  constructor(readonly page: Page) {
    this.expenseTotal = page.getByTestId("summary-expense-total");
    this.recentItems = page.getByTestId("recent-transaction-item");
    this.recentEmpty = page.getByTestId("recent-transactions-empty");
  }

  async goto() {
    await this.page.goto("/");
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
