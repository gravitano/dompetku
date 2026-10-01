/**
 * E02-US02 Catat pemasukan — skenario @smoke (testing.md).
 * Skenario lain ada di `test/web/features/e02-us02-catat-pemasukan.spec.ts`.
 */
import { expect, test } from "../fixtures";
import { HomePage, jakartaDate } from "../pages/home-page";
import { TransactionFormPage } from "../pages/transaction-form";

test.describe("@smoke Catat pemasukan", () => {
  test("mencatat pemasukan gaji", async ({ page, createUser, loginAs, db }) => {
    const user = await createUser("budi");
    await loginAs(user);
    const home = new HomePage(page);
    const form = new TransactionFormPage(page);
    await home.goto();
    const incomeBefore = await home.incomeTotalValue();
    const expenseBefore = await home.expenseTotalValue();

    await form.open();
    await form.selectType("income");
    await expect(form.title).toHaveText("Catat Pemasukan");
    await form.fill({
      amount: "8000000",
      category: "gaji",
      note: "Gaji September",
    });
    await form.submit();

    await expect(form.toast("Pemasukan tersimpan")).toBeVisible();
    await expect(form.dialog).toBeHidden();

    const first = home.recentItems.first();
    await expect(first.getByTestId("transaction-note")).toHaveText(
      "Gaji September",
    );
    await expect(first).toHaveAttribute("data-type", "income");
    await expect(first.getByTestId("transaction-amount")).toHaveText(
      /^\+ .*Rp 8\.000\.000$/,
    );
    await expect(first).toHaveAttribute("data-date", jakartaDate(0));
    await expect(home.incomeTotal).toHaveAttribute(
      "data-value",
      String(incomeBefore + 8_000_000),
    );
    await expect(home.expenseTotal).toHaveAttribute(
      "data-value",
      String(expenseBefore),
    );

    const transactions = await db.getTransactions(user.id);
    expect(transactions).toHaveLength(1);
    expect(transactions[0]).toMatchObject({
      type: "INCOME",
      amount: 8_000_000,
      note: "Gaji September",
      categoryName: "Gaji",
    });
  });
});
