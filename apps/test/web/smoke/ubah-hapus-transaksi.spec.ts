/**
 * E02-US04 Ubah dan hapus transaksi — skenario @smoke (testing.md).
 * Skenario lain ada di `test/web/features/e02-us04-ubah-hapus-transaksi.spec.ts`.
 *
 * Deterministik di tanggal berapa pun: transaksi Background ada di tanggal 28
 * bulan lalu dan daftar dibuka dengan `?month=<bulan lalu>`.
 */
import { expect, test } from "../fixtures";
import type { SeedTransaction } from "../fixtures/db";
import { jakartaDate } from "../pages/home-page";
import { TransactionDetailPage } from "../pages/transaction-detail";
import {
  rupiah,
  shiftMonth,
  TransactionsPage,
} from "../pages/transactions-page";

const BASE = shiftMonth(jakartaDate(0).slice(0, 7), -1);
const ROWS: SeedTransaction[] = [
  {
    date: `${BASE}-10`,
    type: "EXPENSE",
    category: "Transportasi",
    amount: 18_000,
    note: "Ojek",
  },
  {
    date: `${BASE}-28`,
    type: "EXPENSE",
    category: "Makan & Minum",
    amount: 25_000,
    note: "Makan siang",
  },
];
const EXPENSE = 43_000;

test.describe("@smoke Ubah dan hapus transaksi", () => {
  let list: TransactionsPage;
  let detail: TransactionDetailPage;

  test.beforeEach(async ({ page, db, createUser, loginAs }) => {
    const user = await createUser("budi");
    await db.insertTransactions(user.id, ROWS);
    await loginAs(user);
    list = new TransactionsPage(page);
    detail = new TransactionDetailPage(page);
    await list.goto(`?month=${BASE}`);
    await expect(list.summaryExpense).toHaveText(rupiah(EXPENSE));
    await list.row("Makan siang").click();
    await expect(detail.sheet).toBeVisible();
  });

  test("mengubah nominal transaksi", async () => {
    await detail.form.amountInput.fill("30000");
    await detail.save();

    await expect(detail.form.toast("Perubahan tersimpan")).toBeVisible();
    await expect(detail.sheet).toBeHidden();
    await expect(
      list.row("Makan siang").getByTestId("transaction-amount"),
    ).toHaveText(/^− .*Rp 30\.000$/);
    // Total pengeluaran bertambah Rp 5.000.
    await expect(list.summaryExpense).toHaveText(rupiah(EXPENSE + 5_000));
  });

  test("menghapus transaksi", async ({ page }) => {
    await detail.deleteButton.click();
    await expect(detail.deleteDialog).toBeVisible();
    await expect(detail.deleteDialog).toContainText("Hapus transaksi ini?");
    await expect(detail.deleteDialog).toContainText(
      "Tindakan ini tidak bisa dibatalkan.",
    );
    await expect(detail.deleteSummary).toContainText("Makan siang");
    await expect(detail.deleteSummary).toContainText("Rp 25.000");
    await detail.confirmDelete.click();

    await expect(detail.form.toast("Transaksi dihapus")).toBeVisible();
    await expect(detail.sheet).toBeHidden();
    await expect(list.row("Makan siang")).toHaveCount(0);
    // Total pengeluaran berkurang Rp 25.000.
    await expect(list.summaryExpense).toHaveText(rupiah(EXPENSE - 25_000));

    // Tetap hilang setelah reload (terhapus di database).
    await page.reload();
    await expect(list.row("Ojek")).toBeVisible();
    await expect(list.row("Makan siang")).toHaveCount(0);
  });
});
