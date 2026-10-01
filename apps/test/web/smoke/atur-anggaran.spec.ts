/**
 * E03-US01 Atur anggaran kategori — skenario @smoke (testing.md).
 * Skenario lain ada di `test/web/features/e03-us01-atur-anggaran-kategori.spec.ts`.
 * "Oktober 2026" di testing.md = bulan berjalan menurut jam server.
 */
import { expect, test } from "../fixtures";
import { BudgetsPage } from "../pages/budgets-page";
import { jakartaDate } from "../pages/home-page";
import { monthLabel } from "../pages/transactions-page";

test.describe("@smoke Atur anggaran kategori", () => {
  test("mengatur anggaran untuk kategori yang belum diatur", async ({
    page,
    db,
    createUser,
    loginAs,
    isMobile,
  }) => {
    const current = jakartaDate(0).slice(0, 7);
    const user = await createUser("budi");
    await db.insertBudgets(user.id, [
      { month: current, category: "Transportasi", amount: 600_000 },
    ]);
    await loginAs(user);
    await page.goto("/");

    const budgets = new BudgetsPage(page);
    await (
      isMobile
        ? budgets.shell.bottomNav("budgets")
        : budgets.shell.sidebarNav("budgets")
    ).click();
    await budgets.waitForMonth(current);
    await expect(budgets.monthLabel).toHaveText(monthLabel(current));
    await expect(budgets.amount("makan-minum")).toHaveText("Belum diatur");
    await expect(budgets.total).toHaveText("Rp 600.000");

    await budgets.setAmount("makan-minum", "1500000");

    await expect(budgets.toast("Anggaran tersimpan")).toBeVisible();
    await expect(budgets.amount("makan-minum")).toHaveText("Rp 1.500.000");
    await expect(budgets.total).toHaveText("Rp 2.100.000");
  });
});
