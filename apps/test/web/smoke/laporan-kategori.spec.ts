/**
 * E04-US02 Grafik pengeluaran per kategori — skenario @smoke (testing.md).
 * Skenario lain ada di
 * `test/web/features/e04-us02-grafik-pengeluaran-kategori.spec.ts`.
 * "Oktober 2026" di testing.md = bulan berjalan menurut jam server; transaksi
 * bertanggal 1 bulan berjalan (tidak pernah di masa depan).
 */
import { expect, test } from "../fixtures";
import { AppShell } from "../pages/app-shell";
import { HomePage, jakartaDate } from "../pages/home-page";
import { ReportsPage } from "../pages/reports-page";
import { monthLabel, shiftMonth } from "../pages/transactions-page";

test.describe("@smoke Grafik pengeluaran per kategori", () => {
  test("Laporan menampilkan bulan berjalan secara default", async ({
    page,
    db,
    createUser,
    loginAs,
    isMobile,
  }) => {
    const current = jakartaDate(0).slice(0, 7);
    const user = await createUser("budi");
    await db.insertTransactions(user.id, [
      {
        date: `${shiftMonth(current, -1)}-02`,
        type: "EXPENSE",
        category: "Makan & Minum",
        amount: 600_000,
      },
      {
        date: `${current}-01`,
        type: "EXPENSE",
        category: "Makan & Minum",
        amount: 25_000,
      },
    ]);
    await loginAs(user);
    await new HomePage(page).goto();

    const shell = new AppShell(page);
    const nav = isMobile
      ? shell.bottomNav("reports")
      : shell.sidebarNav("reports");
    await nav.click();

    const reports = new ReportsPage(page);
    await expect(page).toHaveURL((url) => url.pathname === "/reports");
    await expect(nav).toHaveAttribute("aria-current", "page");
    await expect(reports.monthLabel).toHaveText(monthLabel(current));
    await expect(reports.total).toHaveText("Rp 25.000");
    await expect(reports.monthNext).toBeDisabled();
    await expect(reports.chart).toBeVisible();
    await expect(reports.items).toHaveCount(1);
  });
});
