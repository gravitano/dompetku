/**
 * E03-US02 Indikator pemakaian anggaran — skenario @smoke (testing.md).
 * Skenario lain ada di
 * `test/web/features/e03-us02-indikator-pemakaian-anggaran.spec.ts`.
 * "Oktober 2026" di testing.md = bulan berjalan menurut jam server; transaksi
 * bertanggal 1 bulan berjalan (tidak pernah di masa depan).
 */
import { expect, test } from "../fixtures";
import { BudgetsPage } from "../pages/budgets-page";
import { jakartaDate } from "../pages/home-page";
import { monthLabel } from "../pages/transactions-page";

test.describe("@smoke Indikator pemakaian anggaran", () => {
  test("menampilkan pemakaian anggaran per kategori", async ({
    page,
    db,
    createUser,
    loginAs,
    isMobile,
  }) => {
    const current = jakartaDate(0).slice(0, 7);
    const user = await createUser("budi");
    await db.insertBudgets(user.id, [
      { month: current, category: "Belanja", amount: 1_000_000 },
    ]);
    await db.insertTransactions(user.id, [
      {
        date: `${current}-01`,
        type: "EXPENSE",
        category: "Belanja",
        amount: 150_000,
      },
      {
        date: `${current}-01`,
        type: "EXPENSE",
        category: "Belanja",
        amount: 250_000,
      },
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

    const row = budgets.row("belanja");
    await expect(row).toContainText("Rp 400.000 / Rp 1.000.000");
    await expect(budgets.remaining("belanja")).toHaveText("Sisa Rp 600.000");
    await expect(budgets.percent("belanja")).toHaveText("40%");
    await expect(row).toHaveAttribute("data-status", "green");
    await expect(budgets.summaryCard).toContainText(
      "Terpakai Rp 400.000 dari Rp 1.000.000",
    );
  });
});
