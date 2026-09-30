import type { Locator, Page } from "@playwright/test";

export type NavKey = "home" | "transactions" | "budgets" | "reports";

/** Page Object kerangka app: header + bottom nav (HP) / sidebar (desktop). */
export class AppShell {
  readonly header: Locator;
  readonly accountMenuButton: Locator;

  constructor(readonly page: Page) {
    this.header = page.getByTestId("app-header");
    this.accountMenuButton = page.getByTestId("account-menu-button");
  }

  bottomNav(key: NavKey) {
    return this.page.getByTestId(`bottom-nav-${key}`);
  }

  sidebarNav(key: NavKey) {
    return this.page.getByTestId(`sidebar-nav-${key}`);
  }
}
