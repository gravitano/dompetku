/**
 * E02-US03 Daftar transaksi dengan filter — skenario @smoke (testing.md).
 * Skenario lain ada di `test/web/features/e02-us03-daftar-transaksi.spec.ts`.
 *
 * Deterministik di tanggal berapa pun: Background ada di bulan lalu (tanggal
 * tetap 28/25/10) dan dua bulan lalu; tab Transaksi dibuka di bulan berjalan
 * lalu ◀ ke bulan lalu.
 */
import { expect, test } from "../fixtures";
import type { SeedTransaction } from "../fixtures/db";
import { jakartaDate } from "../pages/home-page";
import {
  dayLabel,
  lastDayOfMonth,
  monthLabel,
  rupiah,
  shiftMonth,
  TransactionsPage,
} from "../pages/transactions-page";

test.describe("@smoke Daftar transaksi", () => {
  test("menampilkan transaksi per tanggal dengan ringkasan periode", async ({
    page,
    db,
    createUser,
    loginAs,
  }) => {
    const current = jakartaDate(0).slice(0, 7);
    const base = shiftMonth(current, -1);
    const on = (day: number) => `${base}-${day}`;
    const rows: SeedTransaction[] = [
      {
        date: lastDayOfMonth(shiftMonth(base, -1)),
        type: "EXPENSE",
        category: "Belanja",
        amount: 200_000,
        note: "Belanja bulanan",
      },
      {
        date: on(10),
        type: "EXPENSE",
        category: "Tagihan",
        amount: 350_000,
        note: "Listrik",
      },
      {
        date: on(25),
        type: "INCOME",
        category: "Gaji",
        amount: 8_000_000,
        note: "Gaji September",
      },
      {
        date: on(28),
        type: "EXPENSE",
        category: "Makan & Minum",
        amount: 25_000,
        note: "Makan siang",
      },
      {
        date: on(28),
        type: "EXPENSE",
        category: "Transportasi",
        amount: 18_000,
        note: "Ojek",
      },
    ];
    const user = await createUser("budi");
    await db.insertTransactions(user.id, rows);
    await loginAs(user);

    const list = new TransactionsPage(page);
    await list.goto();
    await expect(list.monthLabel).toHaveText(monthLabel(current));
    await expect(list.monthNext).toBeDisabled();

    await list.monthPrev.click();
    await expect(list.monthLabel).toHaveText(monthLabel(base));
    await expect(list.rows).toHaveCount(4);
    await expect(list.groups).toHaveCount(3);
    await expect(
      list.groups.first().getByTestId("transaction-group-label"),
    ).toHaveText(dayLabel(on(28)));
    await expect(page.getByText("Belanja bulanan")).toHaveCount(0);
    await expect(list.summaryIncome).toHaveText(rupiah(8_000_000));
    await expect(list.summaryExpense).toHaveText(rupiah(393_000));
    await expect(list.summaryNet).toHaveText(rupiah(7_607_000));
  });
});
