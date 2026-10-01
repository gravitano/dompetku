/**
 * E02-US01 Catat pengeluaran — skenario @smoke (testing.md).
 * Skenario lain ada di `test/web/features/e02-us01-catat-pengeluaran.spec.ts`.
 */
import { expect, test } from "../fixtures";
import { HomePage, jakartaDate } from "../pages/home-page";
import { TransactionFormPage } from "../pages/transaction-form";

test.describe("@smoke Catat pengeluaran", () => {
  test("mencatat pengeluaran dengan tanggal default", async ({
    page,
    createUser,
    loginAs,
    db,
  }) => {
    const user = await createUser("budi");
    await loginAs(user);
    const home = new HomePage(page);
    const form = new TransactionFormPage(page);
    await home.goto();
    const before = await home.expenseTotalValue();

    await form.open();
    await form.fill({
      amount: "25000",
      category: "makan-minum",
      note: "Makan siang",
    });
    await form.submit();

    await expect(form.toast("Pengeluaran tersimpan")).toBeVisible();
    await expect(form.dialog).toBeHidden();

    const first = home.recentItems.first();
    await expect(first.getByTestId("transaction-note")).toHaveText(
      "Makan siang",
    );
    await expect(first.getByTestId("transaction-amount")).toContainText(
      "Rp 25.000",
    );
    await expect(first).toHaveAttribute("data-date", jakartaDate(0));
    await expect(home.expenseTotal).toHaveAttribute(
      "data-value",
      String(before + 25_000),
    );

    const transactions = await db.getTransactions(user.id);
    expect(transactions).toHaveLength(1);
    expect(transactions[0]).toMatchObject({
      type: "EXPENSE",
      amount: 25_000,
      note: "Makan siang",
      categoryName: "Makan & Minum",
    });
  });
});
