import type { Locator, Page } from "@playwright/test";

const WEEKDAYS = [
  "Minggu",
  "Senin",
  "Selasa",
  "Rabu",
  "Kamis",
  "Jumat",
  "Sabtu",
];
const SHORT_MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
];

/** "YYYY-MM-DD" → "Rabu, 30 Sep 2026" (header grup tanggal). */
export function dayLabel(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  return `${WEEKDAYS[d.getUTCDay()]}, ${d.getUTCDate()} ${SHORT_MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** "YYYY-MM" → "September 2026". */
export function monthLabel(month: string): string {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "UTC",
    month: "long",
    year: "numeric",
  }).format(new Date(`${month}-01T00:00:00Z`));
}

/** Geser "YYYY-MM" sebanyak `offset` bulan. */
export function shiftMonth(month: string, offset: number): string {
  const d = new Date(`${month}-01T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + offset);
  return d.toISOString().slice(0, 7);
}

/** "YYYY-MM" → tanggal terakhir bulan tsb ("YYYY-MM-DD"). */
export function lastDayOfMonth(month: string): string {
  const d = new Date(`${shiftMonth(month, 1)}-01T00:00:00Z`);
  d.setUTCDate(0);
  return d.toISOString().slice(0, 10);
}

/** "Rp 1.250.000". */
export function rupiah(value: number): string {
  return `Rp ${Math.abs(value)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;
}

/** Page Object tab Transaksi (E02-US03). */
export class TransactionsPage {
  readonly title: Locator;
  readonly monthLabel: Locator;
  readonly monthPrev: Locator;
  readonly monthNext: Locator;
  readonly filterButton: Locator;
  readonly filterBadge: Locator;
  readonly filterPanel: Locator;
  readonly filterApply: Locator;
  readonly filterReset: Locator;
  readonly chips: Locator;
  readonly chipsReset: Locator;
  readonly summaryIncome: Locator;
  readonly summaryExpense: Locator;
  readonly summaryNet: Locator;
  readonly summarySkeleton: Locator;
  readonly list: Locator;
  readonly rows: Locator;
  readonly groups: Locator;
  readonly sentinel: Locator;
  readonly listEnd: Locator;
  readonly listLoading: Locator;
  readonly listError: Locator;
  readonly listRetry: Locator;
  readonly empty: Locator;
  readonly emptyMessage: Locator;
  readonly emptyAdd: Locator;
  readonly emptyReset: Locator;

  constructor(readonly page: Page) {
    this.title = page.getByTestId("page-title");
    this.monthLabel = page.getByTestId("month-label");
    this.monthPrev = page.getByTestId("month-prev-button");
    this.monthNext = page.getByTestId("month-next-button");
    this.filterButton = page.getByTestId("filter-button");
    this.filterBadge = page.getByTestId("filter-button-badge");
    this.filterPanel = page.getByTestId("filter-panel");
    this.filterApply = page.getByTestId("filter-apply-button");
    this.filterReset = page.getByTestId("filter-reset-button");
    this.chips = page.getByTestId("filter-chips");
    this.chipsReset = page.getByTestId("filter-chips-reset-button");
    this.summaryIncome = page.getByTestId("summary-income");
    this.summaryExpense = page.getByTestId("summary-expense");
    this.summaryNet = page.getByTestId("summary-net");
    this.summarySkeleton = page.getByTestId("summary-income-skeleton");
    this.list = page.getByTestId("transaction-list");
    this.rows = page.locator('[data-testid^="transaction-row-"]');
    this.groups = page.locator(
      '[data-testid^="transaction-group-"][data-date]',
    );
    this.sentinel = page.getByTestId("transaction-list-sentinel");
    this.listEnd = page.getByTestId("transaction-list-end");
    this.listLoading = page.getByTestId("transaction-list-loading");
    this.listError = page.getByTestId("transaction-list-error");
    this.listRetry = page.getByTestId("transaction-list-retry-button");
    this.empty = page.getByTestId("transactions-empty");
    this.emptyMessage = page.getByTestId("transactions-empty-message");
    this.emptyAdd = page.getByTestId("empty-add-transaction-button");
    this.emptyReset = page.getByTestId("empty-reset-filter-button");
  }

  async goto(search = "") {
    await this.page.goto(`/transactions${search}`);
    await this.title.waitFor();
  }

  /** Catatan (atau nama kategori) tiap baris yang tampil, berurutan. */
  async notes(): Promise<string[]> {
    return this.rows.getByTestId("transaction-note").allTextContents();
  }

  row(note: string): Locator {
    return this.rows.filter({
      has: this.page.getByTestId("transaction-note").getByText(note, {
        exact: true,
      }),
    });
  }

  group(date: string): Locator {
    return this.page.getByTestId(`transaction-group-${date}`);
  }

  typeOption(type: "all" | "expense" | "income"): Locator {
    return this.page.getByTestId(`filter-type-${type}`);
  }

  category(key: string): Locator {
    return this.page.getByTestId(`filter-category-${key}`);
  }

  chip(key: string): Locator {
    return this.page.getByTestId(`filter-chip-${key}`);
  }

  async openFilter() {
    await this.filterButton.click();
    await this.filterPanel.waitFor({ state: "visible" });
  }

  /** Buka panel, pilih jenis & kategori (key), lalu Terapkan. */
  async applyFilter({
    type,
    categories = [],
  }: {
    type?: "all" | "expense" | "income";
    categories?: string[];
  }) {
    await this.openFilter();
    if (type) await this.typeOption(type).click();
    for (const key of categories) await this.category(key).click();
    await this.filterApply.click();
    await this.filterPanel.waitFor({ state: "hidden" });
  }
}
