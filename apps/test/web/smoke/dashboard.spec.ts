/**
 * E04-US01 Dashboard ringkasan bulanan — skenario @smoke (testing.md).
 * Skenario lain ada di
 * `test/web/features/e04-us01-dashboard-ringkasan-bulanan.spec.ts`.
 * "Oktober 2026" di testing.md = bulan berjalan menurut jam server; transaksi
 * bertanggal 1 bulan berjalan (tidak pernah di masa depan).
 */
import { expect, test } from "../fixtures";
import { HomePage, jakartaDate } from "../pages/home-page";
import { monthLabel, shiftMonth } from "../pages/transactions-page";

test.describe("@smoke Dashboard ringkasan bulanan", () => {
  test("Beranda menampilkan ringkasan bulan berjalan setelah login", async ({
    page,
    db,
    createUser,
    loginPage,
  }) => {
    const current = jakartaDate(0).slice(0, 7);
    const date = `${current}-01`;
    const user = await createUser("budi");
    await db.insertTransactions(user.id, [
      {
        date: `${shiftMonth(current, -1)}-15`,
        type: "EXPENSE",
        category: "Belanja",
        amount: 500_000,
      },
      { date, type: "INCOME", category: "Gaji", amount: 8_000_000 },
      { date, type: "EXPENSE", category: "Tagihan", amount: 350_000 },
      { date, type: "EXPENSE", category: "Belanja", amount: 450_000 },
      { date, type: "EXPENSE", category: "Transportasi", amount: 18_000 },
      { date, type: "EXPENSE", category: "Makan & Minum", amount: 25_000 },
      { date, type: "EXPENSE", category: "Hiburan", amount: 100_000 },
    ]);

    await loginPage.goto();
    await loginPage.login(user.email, user.password);

    const home = new HomePage(page);
    await expect(page).toHaveURL((url) => url.pathname === "/");
    await expect(home.title).toHaveText("Beranda");
    await expect(home.period).toHaveText(monthLabel(current));
    await expect(home.incomeTotal).toHaveText("Rp 8.000.000");
    await expect(home.expenseTotal).toHaveText("Rp 943.000");
    await expect(home.balance).toHaveText("+ Rp 7.057.000");
    await expect(home.balance).toHaveAttribute("data-state", "positive");
  });
});
