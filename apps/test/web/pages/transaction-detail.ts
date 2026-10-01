import type { Locator, Page } from "@playwright/test";

import { TransactionFormPage } from "./transaction-form";

/**
 * Page Object Detail Transaksi (E02-US04): form ubah di bottom sheet (HP) /
 * dialog (desktop), tombol hapus + konfirmasi, "Buang perubahan?". Field form
 * memakai selector yang sama dengan form catat (`form`).
 */
export class TransactionDetailPage {
  readonly form: TransactionFormPage;
  readonly sheet: Locator;
  readonly skeleton: Locator;
  readonly title: Locator;
  readonly updateButton: Locator;
  readonly deleteButton: Locator;
  readonly closeButton: Locator;
  readonly recordedAt: Locator;
  readonly archivedBadge: Locator;
  readonly deleteDialog: Locator;
  readonly deleteSummary: Locator;
  readonly confirmDelete: Locator;
  readonly confirmCancel: Locator;
  readonly deleteError: Locator;
  readonly notFound: Locator;
  readonly notFoundTitle: Locator;
  readonly notFoundBack: Locator;

  constructor(readonly page: Page) {
    this.form = new TransactionFormPage(page);
    this.sheet = page.getByTestId("transaction-detail");
    this.skeleton = page.getByTestId("transaction-detail-skeleton");
    this.title = page.getByTestId("transaction-form-title");
    this.updateButton = page.getByTestId("transaction-update-button");
    this.deleteButton = page.getByTestId("transaction-delete-button");
    this.closeButton = page.getByTestId("transaction-cancel-button");
    this.recordedAt = page.getByTestId("transaction-recorded-at");
    this.archivedBadge = page.getByTestId("category-archived-badge");
    this.deleteDialog = page.getByTestId("delete-confirm-dialog");
    this.deleteSummary = page.getByTestId("delete-confirm-summary");
    this.confirmDelete = page.getByTestId("confirm-delete-button");
    this.confirmCancel = page.getByTestId("confirm-cancel-button");
    this.deleteError = page.getByTestId("delete-error-alert");
    this.notFound = page.getByTestId("transaction-not-found");
    this.notFoundTitle = page.getByTestId("transaction-not-found-title");
    this.notFoundBack = page.getByTestId("transaction-not-found-back");
  }

  /** Tombol ✕ (UX-06). */
  async close() {
    await this.closeButton.click();
  }

  async save() {
    await this.updateButton.click();
  }

  /** Tap "Hapus transaksi" lalu "Hapus" di konfirmasi. */
  async deleteAndConfirm() {
    await this.deleteButton.click();
    await this.deleteDialog.waitFor({ state: "visible" });
    await this.confirmDelete.click();
  }
}
