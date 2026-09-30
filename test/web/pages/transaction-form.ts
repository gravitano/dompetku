import type { Locator, Page } from "@playwright/test";

export type TransactionData = {
  amount?: string;
  /** Slug kategori, mis. "makan-minum" (`category-option-<slug>`). */
  category?: string;
  /** "YYYY-MM-DD". */
  date?: string;
  note?: string;
};

/** Page Object FAB "+" dan form Catat Pengeluaran/Pemasukan (E02-US01/US02). */
export class TransactionFormPage {
  readonly fab: Locator;
  readonly dialog: Locator;
  readonly form: Locator;
  readonly title: Locator;
  readonly typeExpense: Locator;
  readonly typeIncome: Locator;
  readonly amountInput: Locator;
  readonly amountError: Locator;
  readonly categoryGrid: Locator;
  readonly categoryOptions: Locator;
  readonly categoryError: Locator;
  readonly categoryEmpty: Locator;
  readonly categoryManageLink: Locator;
  readonly datePicker: Locator;
  readonly dateLabel: Locator;
  readonly dateToday: Locator;
  readonly dateYesterday: Locator;
  readonly dateError: Locator;
  readonly noteInput: Locator;
  readonly noteCounter: Locator;
  readonly submitButton: Locator;
  readonly cancelButton: Locator;
  readonly alert: Locator;
  readonly discardDialog: Locator;
  readonly discardConfirm: Locator;
  readonly discardCancel: Locator;

  constructor(readonly page: Page) {
    this.fab = page.getByTestId("fab-add-transaction");
    this.dialog = page.getByTestId("transaction-form-dialog");
    this.form = page.getByTestId("transaction-form");
    this.title = page.getByTestId("transaction-form-title");
    this.typeExpense = page.getByTestId("transaction-type-toggle-expense");
    this.typeIncome = page.getByTestId("transaction-type-toggle-income");
    this.amountInput = page.getByTestId("transaction-amount-input");
    this.amountError = page.getByTestId("transaction-amount-error");
    this.categoryGrid = page.getByTestId("category-grid");
    this.categoryOptions = this.categoryGrid.getByRole("radio");
    this.categoryError = page.getByTestId("transaction-category-error");
    this.categoryEmpty = page.getByTestId("category-empty");
    this.categoryManageLink = page.getByTestId("category-manage-link");
    this.datePicker = page.getByTestId("transaction-date-picker");
    this.dateLabel = page.getByTestId("transaction-date-label");
    this.dateToday = page.getByTestId("transaction-date-today");
    this.dateYesterday = page.getByTestId("transaction-date-yesterday");
    this.dateError = page.getByTestId("transaction-date-error");
    this.noteInput = page.getByTestId("transaction-note-input");
    this.noteCounter = page.getByTestId("transaction-note-counter");
    this.submitButton = page.getByTestId("transaction-submit-button");
    this.cancelButton = page.getByTestId("transaction-cancel-button");
    this.alert = page.getByTestId("transaction-form-alert");
    this.discardDialog = page.getByTestId("discard-confirm-dialog");
    this.discardConfirm = page.getByTestId("discard-confirm-button");
    this.discardCancel = page.getByTestId("discard-cancel-button");
  }

  category(slug: string): Locator {
    return this.page.getByTestId(`category-option-${slug}`);
  }

  /** Toast sonner dengan teks tertentu. */
  toast(text: string): Locator {
    return this.page.locator("[data-sonner-toast]").filter({ hasText: text });
  }

  async open() {
    await this.fab.click();
    await this.dialog.waitFor({ state: "visible" });
  }

  async fill({ amount, category, date, note }: TransactionData) {
    if (amount !== undefined) await this.amountInput.fill(amount);
    if (category) await this.category(category).click();
    if (date) await this.datePicker.fill(date);
    if (note !== undefined) await this.noteInput.fill(note);
  }

  async submit() {
    await this.submitButton.click();
  }

  /** Pilih jenis transaksi lewat toggle (UX-01 / UX-05 E02-US02). */
  async selectType(type: "expense" | "income") {
    await (type === "income" ? this.typeIncome : this.typeExpense).click();
  }

  /** Buka form, isi, lalu Simpan. */
  async addExpense(data: TransactionData) {
    await this.open();
    await this.fill(data);
    await this.submit();
  }

  /** Buka form, pilih Pemasukan, isi, lalu Simpan. */
  async addIncome(data: TransactionData) {
    await this.open();
    await this.selectType("income");
    await this.fill(data);
    await this.submit();
  }
}
