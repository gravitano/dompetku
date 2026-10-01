/**
 * E03-US03 Peringatan anggaran — skenario @smoke (testing.md). Skenario lain
 * ada di `test/web/features/e03-us03-peringatan-anggaran.spec.ts`.
 * "Oktober 2026" di testing.md = bulan berjalan menurut jam server; transaksi
 * awal bertanggal 1 bulan berjalan, transaksi baru bertanggal hari ini (bawaan
 * form) — keduanya tidak pernah di luar bulan berjalan.
 */
import { expect, test } from "../fixtures";
import { BudgetAlerts } from "../pages/budget-alerts";
import { jakartaDate } from "../pages/home-page";
import { TransactionFormPage } from "../pages/transaction-form";

test.describe("@smoke Peringatan anggaran", () => {
  test("peringatan hampir habis saat melewati 80%", async ({
    page,
    db,
    createUser,
    loginAs,
  }) => {
    const current = jakartaDate(0).slice(0, 7);
    const user = await createUser("budi");
    await db.insertBudgets(user.id, [
      { month: current, category: "Makan & Minum", amount: 1_500_000 },
    ]);
    await db.insertTransactions(user.id, [
      {
        date: `${current}-01`,
        type: "EXPENSE",
        category: "Makan & Minum",
        amount: 1_100_000,
      },
    ]);
    await loginAs(user);
    await page.goto("/");

    const form = new TransactionFormPage(page);
    const alerts = new BudgetAlerts(page);
    await form.addExpense({ amount: "175000", category: "makan-minum" });

    await expect(form.toast("Pengeluaran tersimpan")).toBeVisible();
    await expect(alerts.toast).toHaveCount(1);
    await expect(alerts.toast).toHaveAttribute("data-level", "warning");
    await expect(alerts.toastMessage).toHaveText(
      "Anggaran Makan & Minum sudah terpakai 85%. Sisa Rp 225.000.",
    );
  });
});
