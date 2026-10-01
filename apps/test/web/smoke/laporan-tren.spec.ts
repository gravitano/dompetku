/**
 * E04-US03 Grafik tren bulanan — skenario @smoke (testing.md). Skenario lain
 * ada di `test/web/features/e04-us03-grafik-tren-bulanan.spec.ts`.
 * "Oktober 2026" di testing.md = bulan berjalan menurut jam server; transaksi
 * bulan berjalan bertanggal 1 (tidak pernah di masa depan), bulan lalu
 * bertanggal tetap.
 */
import { expect, test } from "../fixtures";
import { HomePage, jakartaDate } from "../pages/home-page";
import {
  ReportsPage,
  ReportsTrend,
  shortMonthLabel,
} from "../pages/reports-page";
import { shiftMonth } from "../pages/transactions-page";

test.describe("@smoke Grafik tren bulanan", () => {
  test("menampilkan tren 6 bulan terakhir termasuk bulan berjalan", async ({
    page,
    db,
    createUser,
    loginAs,
    isMobile,
  }) => {
    const current = jakartaDate(0).slice(0, 7);
    const months = [-5, -4, -3, -2, -1, 0].map((n) => shiftMonth(current, n));
    const user = await createUser("budi");
    await db.insertTransactions(user.id, [
      {
        date: `${shiftMonth(current, -6)}-10`,
        type: "EXPENSE",
        category: "Makan & Minum",
        amount: 5_000_000,
      },
      {
        date: `${shiftMonth(current, -1)}-02`,
        type: "INCOME",
        category: "Gaji",
        amount: 8_000_000,
      },
      {
        date: `${shiftMonth(current, -1)}-05`,
        type: "EXPENSE",
        category: "Makan & Minum",
        amount: 3_000_000,
      },
      {
        date: `${current}-01`,
        type: "EXPENSE",
        category: "Makan & Minum",
        amount: 600_000,
      },
    ]);
    await loginAs(user);
    await new HomePage(page).goto();
    await page.goto("/reports");

    const reports = new ReportsPage(page);
    const trend = new ReportsTrend(page);
    await reports.root.waitFor();
    await expect(trend.title).toHaveText("Tren 6 bulan");
    expect(await trend.barMonths()).toEqual(months);
    await expect(trend.xAxisLabels).toHaveText(months.map(shortMonthLabel));
    await expect(trend.legend.getByRole("listitem")).toHaveText([
      "Pemasukan",
      "Pengeluaran",
    ]);
    // 3.600.000 ÷ 6 (bulan ke-7 tidak dihitung).
    await expect(trend.average).toHaveText(
      "Rata-rata pengeluaran per bulan: Rp 600.000",
    );
    await trend.focusMonth(shiftMonth(current, -1), isMobile);
    await expect(trend.tooltipIncome).toHaveText("Rp 8.000.000");
    await expect(trend.tooltipExpense).toHaveText("Rp 3.000.000");
  });
});
