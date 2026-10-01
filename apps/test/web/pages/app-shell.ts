import type { Locator, Page } from "@playwright/test";

export type NavKey = "home" | "transactions" | "budgets" | "reports";

/** Page Object kerangka app: header + bottom nav (HP) / sidebar (desktop). */
export class AppShell {
  readonly header: Locator;
  /** Tombol menu akun (avatar + nama) di header kanan atas. */
  readonly accountMenu: Locator;
  /** Alias lama (E01-US01). */
  readonly accountMenuButton: Locator;
  readonly accountMenuContent: Locator;
  readonly accountMenuUserName: Locator;
  readonly accountMenuEmail: Locator;
  readonly accountMenuCategories: Locator;
  readonly logoutItem: Locator;

  constructor(readonly page: Page) {
    this.header = page.getByTestId("app-header");
    this.accountMenu = page.getByTestId("account-menu");
    this.accountMenuButton = this.accountMenu;
    this.accountMenuContent = page.getByTestId("account-menu-content");
    this.accountMenuUserName = page.getByTestId("account-menu-user-name");
    this.accountMenuEmail = page.getByTestId("account-menu-email");
    this.accountMenuCategories = page.getByTestId("account-menu-categories");
    this.logoutItem = page.getByTestId("account-menu-logout");
  }

  bottomNav(key: NavKey) {
    return this.page.getByTestId(`bottom-nav-${key}`);
  }

  sidebarNav(key: NavKey) {
    return this.page.getByTestId(`sidebar-nav-${key}`);
  }

  async openAccountMenu() {
    await this.accountMenu.click();
    await this.accountMenuContent.waitFor({ state: "visible" });
  }

  async logout() {
    await this.openAccountMenu();
    await this.logoutItem.click();
    await this.page.waitForURL(
      (url) => url.pathname === "/login" && url.searchParams.has("logout"),
    );
  }
}
