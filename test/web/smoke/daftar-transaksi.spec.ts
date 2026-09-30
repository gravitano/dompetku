/**
 * E02-US03 Daftar transaksi dengan filter — skenario @smoke (testing.md).
 * Skenario lain ada di `test/web/features/e02-us03-daftar-transaksi.spec.ts`.
 */
import { expect, test } from "../fixtures";
import { jakartaDate } from "../pages/home-page";
import {
  dayLabel,
  monthLabel,
  rupiah,
  shiftMonth,
  TransactionsPage,
} from "../pages/transactions-page";

test.describe("@smoke Daftar transaksi", () => {
  test("menampilkan transaksi bulan berjalan per tanggal", async ({
    page,
    db,
    createUser,
    loginAs,
  }) => {
    const today = jakartaDate(0);
    const month = today.slice(0, 7);
    const day = Number(today.slice(8, 10));
    const earlier = (n: number) => jakartaDate(-Math.min(n, day - 1));
    const lastMonth = jakartaDate(-day);
    const rows = [
      {
        date: lastMonth,
        type: "EXPENSE",
        category: "Belanja",
        amount: 200_000,
        note: "Belanja bulanan",
      },
      {
        date: earlier(20),
        type: "EXPENSE",
        category: "Tagihan",
        amount: 350_000,
        note: "Listrik",
      },
      {
        date: earlier(5),
        type: "INCOME",
        category: "Gaji",
        amount: 8_000_000,
        note: "Gaji September",
      },
      {
        date: today,
        type: "EXPENSE",
        category: "Makan & Minum",
        amount: 25_000,
        note: "Makan siang",
      },
      {
        date: today,
        type: "EXPENSE",
        category: "Transportasi",
        amount: 18_000,
        note: "Ojek",
      },
    ] as const;
    const user = await createUser("budi");
    await db.insertTransactions(user.id, rows);
    await loginAs(user);

    const list = new TransactionsPage(page);
    await list.goto();

    const current = rows.filter((r) => r.date.startsWith(month));
    const dates = [...new Set(current.map((r) => r.date))];
    await expect(list.monthLabel).toHaveText(monthLabel(month));
    await expect(list.rows).toHaveCount(current.length);
    await expect(list.groups).toHaveCount(dates.length);
    await expect(
      list.groups.first().getByTestId("transaction-group-label"),
    ).toHaveText(dayLabel(today));
    await expect(page.getByText("Belanja bulanan")).toHaveCount(0);
    await expect(list.summaryIncome).toHaveText(rupiah(8_000_000));
    await expect(list.summaryExpense).toHaveText(rupiah(393_000));
    await expect(list.summaryNet).toHaveText(rupiah(7_607_000));
    expect(shiftMonth(month, -1)).toBe(lastMonth.slice(0, 7));
  });
});
