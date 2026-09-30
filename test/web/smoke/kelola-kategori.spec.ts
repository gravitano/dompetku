/**
 * E02-US05 Kelola kategori — skenario @smoke (testing.md).
 * Skenario lain ada di `test/web/features/e02-us05-kelola-kategori.spec.ts`.
 */
import { expect, test } from "../fixtures";
import { CategoriesPage } from "../pages/categories-page";
import { TransactionFormPage } from "../pages/transaction-form";

test.describe("@smoke Kelola kategori", () => {
  test("menambah kategori pengeluaran baru lalu memakainya di form catat", async ({
    page,
    createUser,
    loginAs,
  }) => {
    const user = await createUser("budi");
    await loginAs(user);
    await page.goto("/");

    const categories = new CategoriesPage(page);
    await categories.openFromAccountMenu();
    await expect(categories.tab("expense")).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await categories.add("Kopi", "coffee");

    await expect(categories.toast("Kategori ditambahkan")).toBeVisible();
    await expect(categories.activeRow("kopi")).toBeVisible();

    const form = new TransactionFormPage(page);
    await page.goto("/");
    await form.addExpense({
      amount: "18000",
      category: "kopi",
      note: "Kopi susu",
    });
    await expect(form.toast("Pengeluaran tersimpan")).toBeVisible();
  });
});
