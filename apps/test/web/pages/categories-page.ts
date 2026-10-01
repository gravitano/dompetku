import type { Locator, Page } from "@playwright/test";

import { AppShell } from "./app-shell";

export type CategoryTab = "expense" | "income";

/** Page Object halaman Kelola Kategori + form kategori (E02-US05). */
export class CategoriesPage {
  readonly shell: AppShell;
  readonly root: Locator;
  readonly title: Locator;
  readonly addButton: Locator;
  readonly activeList: Locator;
  readonly archivedSection: Locator;
  readonly archivedToggle: Locator;
  readonly archivedList: Locator;
  readonly sheet: Locator;
  readonly formTitle: Locator;
  readonly nameInput: Locator;
  readonly nameCounter: Locator;
  readonly nameError: Locator;
  readonly iconError: Locator;
  readonly iconPreview: Locator;
  readonly submitButton: Locator;
  readonly cancelButton: Locator;
  readonly formAlert: Locator;
  readonly archiveButton: Locator;
  readonly archiveHelp: Locator;
  readonly moreButton: Locator;
  readonly deleteButton: Locator;
  readonly deleteDialog: Locator;
  readonly deleteTitle: Locator;
  readonly confirmDelete: Locator;
  readonly confirmCancel: Locator;

  constructor(readonly page: Page) {
    this.shell = new AppShell(page);
    this.root = page.getByTestId("categories-page");
    this.title = page.getByTestId("page-title");
    this.addButton = page.getByTestId("category-add-button");
    this.activeList = page.getByTestId("category-active-list");
    this.archivedSection = page.getByTestId("category-archived-section");
    this.archivedToggle = page.getByTestId("category-archived-toggle");
    this.archivedList = page.getByTestId("category-archived-list");
    this.sheet = page.getByTestId("category-form-sheet");
    this.formTitle = page.getByTestId("category-form-title");
    this.nameInput = page.getByTestId("category-name-input");
    this.nameCounter = page.getByTestId("category-name-counter");
    this.nameError = page.getByTestId("category-name-error");
    this.iconError = page.getByTestId("category-icon-error");
    this.iconPreview = page.getByTestId("category-icon-preview");
    this.submitButton = page.getByTestId("category-submit-button");
    this.cancelButton = page.getByTestId("category-cancel-button");
    this.formAlert = page.getByTestId("category-form-alert");
    this.archiveButton = page.getByTestId("category-archive-button");
    this.archiveHelp = page.getByTestId("category-archive-help");
    this.moreButton = page.getByTestId("category-more-button");
    this.deleteButton = page.getByTestId("category-delete-button");
    this.deleteDialog = page.getByTestId("category-delete-dialog");
    this.deleteTitle = page.getByTestId("category-delete-title");
    this.confirmDelete = page.getByTestId("confirm-delete-button");
    this.confirmCancel = page.getByTestId("confirm-cancel-button");
  }

  async goto(tab: CategoryTab = "expense") {
    await this.page.goto(
      tab === "income" ? "/categories?type=income" : "/categories",
    );
    await this.root.waitFor();
  }

  /** UX-01: menu akun → Kategori. */
  async openFromAccountMenu() {
    await this.shell.openAccountMenu();
    await this.shell.accountMenuCategories.click();
    await this.page.waitForURL((url) => url.pathname === "/categories");
    await this.root.waitFor();
  }

  tab(tab: CategoryTab): Locator {
    return this.page.getByTestId(`category-tab-${tab}`);
  }

  async selectTab(tab: CategoryTab) {
    await this.tab(tab).click();
    await this.root
      .and(this.page.locator(`[data-tab="${tab.toUpperCase()}"]`))
      .waitFor();
  }

  /** Baris kategori (aktif atau terarsip) di tab aktif, mis. "makan-minum". */
  row(slug: string): Locator {
    return this.page.getByTestId(`category-row-${slug}`);
  }

  activeRow(slug: string): Locator {
    return this.activeList.getByTestId(`category-row-${slug}`);
  }

  archivedRow(slug: string): Locator {
    return this.archivedList.getByTestId(`category-row-${slug}`);
  }

  /** Nama kategori aktif di tab aktif, berurutan. */
  async activeNames(): Promise<string[]> {
    return this.activeList.getByTestId("category-row-name").allTextContents();
  }

  restoreButton(slug: string): Locator {
    return this.page.getByTestId(`category-restore-button-${slug}`);
  }

  iconOption(key: string): Locator {
    return this.page.getByTestId(`category-icon-option-${key}`);
  }

  async expandArchived() {
    if ((await this.archivedToggle.getAttribute("aria-expanded")) !== "true") {
      await this.archivedToggle.click();
    }
    await this.archivedList.waitFor();
  }

  async openAdd() {
    await this.addButton.click();
    await this.sheet.waitFor({ state: "visible" });
  }

  async openCategory(slug: string) {
    await this.activeRow(slug).click();
    await this.sheet.waitFor({ state: "visible" });
  }

  /** Buka form tambah, isi nama + ikon, lalu Simpan. */
  async add(name: string, icon?: string) {
    await this.openAdd();
    await this.nameInput.fill(name);
    if (icon) await this.iconOption(icon).click();
    await this.submitButton.click();
  }

  /** Toast sonner dengan teks tertentu. */
  toast(text: string): Locator {
    return this.page.locator("[data-sonner-toast]").filter({ hasText: text });
  }
}
