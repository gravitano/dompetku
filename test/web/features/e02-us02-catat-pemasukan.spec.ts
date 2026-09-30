/**
 * E02-US02 Catat pemasukan — docs/features/phase-01-mvp/e-02---pencatatan-transaksi/
 * e02-us02--catat-pemasukan---testing.md
 *
 * Skenario @smoke "Mencatat pemasukan gaji" ada di
 * `test/web/smoke/catat-pemasukan.spec.ts`.
 *
 * Data uji: tiap test membuat akun baru (`budi+…@example.com`, kategori bawaan,
 * tanpa transaksi) lewat fixture `createUser` — aman untuk test paralel di
 * 2 viewport (HP 390×844 & desktop 1280×800).
 */
import { expect, test, type CreatedUser } from "../fixtures";
import {
  abortServerActions,
  delayServerActions,
} from "../fixtures/server-actions";
import { AppShell } from "../pages/app-shell";
import { HomePage, jakartaDate } from "../pages/home-page";
import { TransactionFormPage } from "../pages/transaction-form";

const MESSAGES = {
  saved: "Pemasukan tersimpan",
  system: "Gagal menyimpan. Periksa koneksi lalu coba lagi.",
  chooseCategory: "Pilih kategori",
  amountZero: "Nominal harus lebih dari 0",
  noIncomeCategories: "Belum ada kategori pemasukan",
};

const INCOME_SLUGS = ["gaji", "bonus", "hadiah", "lainnya"];
const INCOME_NAMES = ["Gaji", "Bonus", "Hadiah", "Lainnya"];

test.describe("Catat pemasukan", () => {
  let user: CreatedUser;
  let home: HomePage;
  let form: TransactionFormPage;

  test.beforeEach(async ({ page, createUser, loginAs }) => {
    user = await createUser("budi");
    await loginAs(user);
    home = new HomePage(page);
    form = new TransactionFormPage(page);
    await home.goto();
    await expect(home.incomeTotal).toHaveText("Rp 0");
    await expect(home.expenseTotal).toHaveText("Rp 0");
  });

  test.describe("@happy-path", () => {
    test("form default ke Pengeluaran", async () => {
      await form.open();

      await expect(form.typeExpense).toHaveAttribute("aria-checked", "true");
      await expect(form.typeIncome).toHaveAttribute("aria-checked", "false");
      await expect(form.typeIncome).toBeEnabled();
      await expect(form.title).toHaveText("Catat Pengeluaran");
    });

    test("pemasukan menambah total pemasukan, bukan total pengeluaran", async ({
      db,
    }) => {
      // Sudah ada pengeluaran bulan ini.
      await form.addExpense({
        amount: "25000",
        category: "makan-minum",
        note: "Makan siang",
      });
      await expect(home.expenseTotal).toHaveText("Rp 25.000");

      await form.addIncome({
        amount: "1500000",
        category: "bonus",
        note: "Bonus proyek",
      });
      await expect(form.toast(MESSAGES.saved)).toBeVisible();
      await expect(home.incomeTotal).toHaveText("Rp 1.500.000");
      await expect(home.expenseTotal).toHaveText("Rp 25.000");

      // + hijau untuk pemasukan, − merah untuk pengeluaran.
      const income = home.item("Bonus proyek");
      await expect(income).toHaveAttribute("data-type", "income");
      await expect(income.getByTestId("transaction-amount")).toHaveText(
        /^\+ .*Rp 1\.500\.000$/,
      );
      const expense = home.item("Makan siang");
      await expect(expense).toHaveAttribute("data-type", "expense");
      await expect(expense.getByTestId("transaction-amount")).toHaveText(
        /^− .*Rp 25\.000$/,
      );
      await expect(home.recentItems.first()).toContainText("Bonus proyek");

      const color = (el: typeof income) =>
        el
          .getByTestId("transaction-amount")
          .evaluate((node) => getComputedStyle(node).color);
      expect(await color(income)).not.toBe(await color(expense));

      const saved = await db.getTransactions(user.id);
      expect(saved.map((t) => t.type)).toEqual(["INCOME", "EXPENSE"]);
    });

    test("pemasukan tanggal bulan lalu tersimpan tetapi tidak menambah total bulan ini", async ({
      db,
    }) => {
      const dayOfMonth = Number(jakartaDate(0).slice(8, 10));
      const lastMonth = jakartaDate(-dayOfMonth); // hari terakhir bulan lalu

      await form.open();
      await form.selectType("income");
      await form.fill({
        amount: "8000000",
        category: "gaji",
        date: lastMonth,
        note: "Gaji bulan lalu",
      });
      await form.submit();

      await expect(form.toast(MESSAGES.saved)).toBeVisible();
      await expect(home.item("Gaji bulan lalu")).toHaveAttribute(
        "data-date",
        lastMonth,
      );
      await expect(home.incomeTotal).toHaveText("Rp 0");
      expect((await db.getTransactions(user.id))[0]).toMatchObject({
        type: "INCOME",
        transactionDate: lastMonth,
      });
    });
  });

  test.describe("@validation", () => {
    test("mengganti jenis mengganti daftar kategori", async () => {
      await form.open();
      await form.category("makan-minum").click();
      await form.selectType("income");

      await expect(form.title).toHaveText("Catat Pemasukan");
      await expect(form.typeIncome).toHaveAttribute("aria-checked", "true");
      await expect(form.categoryOptions).toHaveText(INCOME_NAMES);
      for (const slug of INCOME_SLUGS) {
        await expect(form.category(slug)).toHaveAttribute(
          "aria-checked",
          "false",
        );
      }
      await expect(form.category("makan-minum")).toHaveCount(0);
    });

    test("kembali ke Pengeluaran mengosongkan kategori pemasukan (UX-05)", async () => {
      await form.open();
      await form.selectType("income");
      await form.category("hadiah").click();
      await form.selectType("expense");

      await expect(form.title).toHaveText("Catat Pengeluaran");
      await expect(form.category("hadiah")).toHaveCount(0);
      await expect(form.category("makan-minum")).toBeVisible();
      await expect(
        form.categoryGrid.locator("[aria-checked=true]"),
      ).toHaveCount(0);

      // Kategori "Lainnya" ada di kedua jenis, tetapi pilihannya tidak terbawa.
      await form.category("lainnya").click();
      await form.selectType("income");
      await expect(form.category("lainnya")).toHaveAttribute(
        "aria-checked",
        "false",
      );
    });

    test("nominal dan catatan tetap ada saat mengganti jenis", async () => {
      await form.open();
      await form.fill({ amount: "500000", note: "Uang dari teman" });
      await form.dateYesterday.click();
      await form.selectType("income");

      await expect(form.amountInput).toHaveValue("Rp 500.000");
      await expect(form.noteInput).toHaveValue("Uang dari teman");
      await expect(form.datePicker).toHaveValue(jakartaDate(-1));
    });

    test("kategori pemasukan wajib dipilih", async ({ db }) => {
      await form.open();
      await form.selectType("income");
      await form.fill({ amount: "1000000" });
      await form.submit();

      await expect(form.categoryError).toHaveText(MESSAGES.chooseCategory);
      await expect(form.dialog).toBeVisible();
      await expect(form.typeIncome).toHaveAttribute("aria-checked", "true");
      expect(await db.getTransactions(user.id)).toHaveLength(0);
    });

    test("nominal 0 ditolak pada mode pemasukan", async ({ db }) => {
      await form.open();
      await form.selectType("income");
      await form.fill({ amount: "0", category: "bonus" });
      await form.submit();

      await expect(form.amountError).toHaveText(MESSAGES.amountZero);
      await expect(form.amountInput).toHaveAttribute("aria-invalid", "true");
      await expect(form.category("bonus")).toHaveAttribute(
        "aria-checked",
        "true",
      );
      expect(await db.getTransactions(user.id)).toHaveLength(0);
    });

    test("paste nominal berformat Rupiah dengan desimal", async ({
      page,
      context,
      browserName,
    }) => {
      test.skip(browserName !== "chromium", "izin clipboard khusus Chromium");
      await context.grantPermissions(["clipboard-read", "clipboard-write"]);
      await form.open();
      await form.selectType("income");

      const paste = async (text: string) => {
        await page.evaluate(
          (value) => navigator.clipboard.writeText(value),
          text,
        );
        await form.amountInput.fill("");
        await form.amountInput.focus();
        await page.keyboard.press("ControlOrMeta+V");
      };

      await paste("Rp 25.000,00");
      await expect(form.amountInput).toHaveValue("Rp 25.000");
      await paste("1.500.000,50");
      await expect(form.amountInput).toHaveValue("Rp 1.500.000");
      await paste("Rp 8.000.000");
      await expect(form.amountInput).toHaveValue("Rp 8.000.000");
    });
  });

  test.describe("@error-handling", () => {
    test("tombol simpan ditekan dua kali → hanya satu pemasukan", async ({
      page,
      db,
    }) => {
      await delayServerActions(page, 800);
      await form.open();
      await form.selectType("income");
      await form.fill({ amount: "750000", category: "hadiah", note: "Double" });

      await form.submitButton.evaluate((button: HTMLButtonElement) => {
        button.click();
        button.click();
      });
      await expect(form.submitButton).toBeDisabled();
      await expect(form.typeExpense).toBeDisabled();
      await form.submitButton.click({ force: true }).catch(() => {});

      await expect(form.toast(MESSAGES.saved)).toBeVisible();
      await expect(home.item("Double")).toHaveCount(1);
      await expect(home.incomeTotal).toHaveText("Rp 750.000");
      const saved = await db.getTransactions(user.id);
      expect(saved).toHaveLength(1);
      expect(saved[0].type).toBe("INCOME");
    });

    test("gagal menyimpan karena koneksi terputus → jenis & data tetap", async ({
      page,
      db,
    }) => {
      await form.open();
      await form.selectType("income");
      await form.fill({
        amount: "8000000",
        category: "gaji",
        note: "Gaji September",
      });

      await abortServerActions(page);
      await form.submit();

      await expect(form.alert).toHaveText(MESSAGES.system);
      await expect(form.typeIncome).toHaveAttribute("aria-checked", "true");
      await expect(form.title).toHaveText("Catat Pemasukan");
      await expect(form.amountInput).toHaveValue("Rp 8.000.000");
      await expect(form.category("gaji")).toHaveAttribute(
        "aria-checked",
        "true",
      );
      await expect(form.noteInput).toHaveValue("Gaji September");
      await expect(form.submitButton).toBeEnabled();
      expect(await db.getTransactions(user.id)).toHaveLength(0);

      // Koneksi pulih → coba lagi.
      await page.unrouteAll({ behavior: "wait" });
      await form.submit();
      await expect(form.toast(MESSAGES.saved)).toBeVisible();
      await expect(home.incomeTotal).toHaveText("Rp 8.000.000");
      expect(await db.getTransactions(user.id)).toHaveLength(1);
    });
  });

  test.describe("@security", () => {
    test("pemasukan tidak terlihat oleh pengguna lain", async ({
      page,
      createUser,
      loginAs,
    }) => {
      await form.addIncome({
        amount: "8000000",
        category: "gaji",
        note: "Gaji September",
      });
      await expect(home.item("Gaji September")).toBeVisible();
      await expect(home.incomeTotal).toHaveText("Rp 8.000.000");

      await new AppShell(page).logout();
      const ani = await createUser("ani", "Ani Wijaya");
      await loginAs(ani);
      await home.goto();

      await expect(home.recentEmpty).toBeVisible();
      await expect(home.item("Gaji September")).toHaveCount(0);
      await expect(home.incomeTotal).toHaveText("Rp 0");
      await page.goto("/transactions");
      await expect(page.getByText("Gaji September")).toHaveCount(0);
    });
  });

  test.describe("@ux", () => {
    test("mode pemasukan: fokus Nominal, aksen & tombol Simpan hijau", async () => {
      await form.open();
      const expenseBg = await form.submitButton.evaluate(
        (el) => getComputedStyle(el).backgroundColor,
      );

      await form.selectType("income");
      await expect(form.amountInput).toBeFocused();
      await expect(form.submitButton).toHaveAttribute("data-type", "INCOME");
      await expect
        .poll(() =>
          form.submitButton.evaluate(
            (el) => getComputedStyle(el).backgroundColor,
          ),
        )
        .not.toBe(expenseBg);

      await form.category("gaji").click();
      await expect(form.category("gaji")).toHaveAttribute(
        "data-tone",
        "income",
      );
    });

    test("empty state: tidak ada kategori pemasukan aktif", async ({
      page,
      db,
    }) => {
      for (const name of INCOME_NAMES) {
        await db.archiveCategory(user.id, name, "INCOME");
      }
      await page.reload();
      await form.open();
      await expect(form.submitButton).toBeEnabled();

      await form.selectType("income");
      await expect(form.categoryEmpty).toContainText(
        MESSAGES.noIncomeCategories,
      );
      await expect(form.categoryManageLink).toHaveText("Kelola kategori");
      await expect(form.categoryManageLink).toHaveAttribute(
        "aria-disabled",
        "true",
      );
      await expect(form.submitButton).toBeDisabled();

      // Kategori pengeluaran tetap tersedia.
      await form.selectType("expense");
      await expect(form.categoryEmpty).toBeHidden();
      await expect(form.submitButton).toBeEnabled();
    });

    test("toggle bisa dipakai dengan keyboard (panah kiri/kanan)", async () => {
      await form.open();
      await form.typeExpense.focus();
      await form.page.keyboard.press("ArrowRight");

      await expect(form.typeIncome).toHaveAttribute("aria-checked", "true");
      await expect(form.typeIncome).toBeFocused();
      await expect(form.title).toHaveText("Catat Pemasukan");
    });
  });
});
