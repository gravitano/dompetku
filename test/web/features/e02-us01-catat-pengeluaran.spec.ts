/**
 * E02-US01 Catat pengeluaran — docs/features/phase-01-mvp/e-02---pencatatan-transaksi/
 * e02-us01--catat-pengeluaran---testing.md
 *
 * Skenario @smoke "Mencatat pengeluaran dengan tanggal default" ada di
 * `test/web/smoke/catat-pengeluaran.spec.ts`.
 *
 * Data uji: tiap test membuat akun baru (`budi+…@example.com`, kategori bawaan,
 * tanpa transaksi) lewat fixture `createUser` — setara "budi tanpa transaksi
 * (reset via seed)" tetapi aman untuk test paralel di 2 viewport.
 */
import type { Page } from "@playwright/test";

import { expect, test, type CreatedUser } from "../fixtures";
import { AppShell } from "../pages/app-shell";
import { HomePage, jakartaDate } from "../pages/home-page";
import { TransactionFormPage } from "../pages/transaction-form";

const MESSAGES = {
  saved: "Pengeluaran tersimpan",
  system: "Gagal menyimpan. Periksa koneksi lalu coba lagi.",
  chooseCategory: "Pilih kategori",
  dateFuture: "Tanggal tidak boleh melebihi hari ini",
  discard: "Buang perubahan?",
};

const EXPENSE_SLUGS = [
  "makan-minum",
  "transportasi",
  "belanja",
  "tagihan",
  "hiburan",
  "kesehatan",
  "lainnya",
];

/** Tahan request Server Action (POST + header `Next-Action`). */
async function delayServerActions(page: Page, ms: number) {
  await page.route("**/*", async (route) => {
    const request = route.request();
    if (request.method() === "POST" && request.headers()["next-action"]) {
      await new Promise((resolve) => setTimeout(resolve, ms));
    }
    await route.fallback();
  });
}

/** Putuskan request Server Action (simulasi koneksi terputus). */
async function abortServerActions(page: Page) {
  await page.route("**/*", async (route) => {
    const request = route.request();
    if (request.method() === "POST" && request.headers()["next-action"]) {
      await route.abort("internetdisconnected");
      return;
    }
    await route.fallback();
  });
}

test.describe("Catat pengeluaran", () => {
  let user: CreatedUser;
  let home: HomePage;
  let form: TransactionFormPage;

  test.beforeEach(async ({ page, createUser, loginAs }) => {
    user = await createUser("budi");
    await loginAs(user);
    home = new HomePage(page);
    form = new TransactionFormPage(page);
    await home.goto();
    await expect(home.expenseTotal).toHaveText("Rp 0");
  });

  test.describe("@happy-path", () => {
    test("mencatat pengeluaran untuk tanggal kemarin tanpa catatan", async ({
      db,
    }) => {
      const yesterday = jakartaDate(-1);

      await form.open();
      await form.fill({ amount: "18000", category: "transportasi" });
      await form.dateYesterday.click();
      await expect(form.datePicker).toHaveValue(yesterday);
      await expect(form.dateLabel).toHaveText(/^Kemarin, /);
      await form.submit();

      await expect(form.toast(MESSAGES.saved)).toBeVisible();
      await expect(form.dialog).toBeHidden();
      const row = home.item("Transportasi");
      await expect(row).toHaveAttribute("data-date", yesterday);
      await expect(row.getByTestId("transaction-amount")).toContainText(
        "Rp 18.000",
      );

      const [saved] = await db.getTransactions(user.id);
      expect(saved).toMatchObject({
        type: "EXPENSE",
        amount: 18_000,
        transactionDate: yesterday,
        note: null,
        categoryName: "Transportasi",
      });
    });

    test("tanggal bisa diubah lewat date picker", async ({ db }) => {
      const date = jakartaDate(-3);

      await form.open();
      await form.fill({
        amount: "42000",
        category: "kesehatan",
        date,
        note: "Obat flu",
      });
      await form.submit();

      await expect(form.toast(MESSAGES.saved)).toBeVisible();
      await expect(home.item("Obat flu")).toHaveAttribute("data-date", date);
      expect((await db.getTransactions(user.id))[0].transactionDate).toBe(date);
    });

    test("FAB di halaman Transaksi membuka form dan transaksi langsung tampil", async ({
      page,
    }) => {
      await page.goto("/transactions");
      await expect(page.getByTestId("page-title")).toHaveText("Transaksi");

      await form.open();
      await expect(form.amountInput).toBeFocused();
      await form.fill({
        amount: "35000",
        category: "hiburan",
        note: "Tiket bioskop",
      });
      await form.submit();

      await expect(form.toast(MESSAGES.saved)).toBeVisible();
      await expect(home.item("Tiket bioskop")).toBeVisible();
    });

    test("transaksi terbaru tampil paling atas dan total bulan ini terakumulasi", async () => {
      await form.addExpense({
        amount: "10000",
        category: "belanja",
        note: "Sabun",
      });
      await expect(form.toast(MESSAGES.saved)).toBeVisible();
      await expect(home.expenseTotal).toHaveText("Rp 10.000");

      await form.addExpense({
        amount: "15000",
        category: "makan-minum",
        note: "Kopi",
      });
      await expect(home.expenseTotal).toHaveText("Rp 25.000");
      await expect(home.recentItems.first()).toContainText("Kopi");
      await expect(home.recentItems.nth(1)).toContainText("Sabun");
    });
  });

  test.describe("@validation", () => {
    test("nominal diformat otomatis saat diketik", async () => {
      await form.open();
      await form.amountInput.fill("1500000");
      await expect(form.amountInput).toHaveValue("Rp 1.500.000");

      // Mengetik per karakter (keyboard numerik) juga terformat.
      await form.amountInput.fill("");
      await form.amountInput.pressSequentially("25000");
      await expect(form.amountInput).toHaveValue("Rp 25.000");
      await form.amountInput.press("Backspace");
      await expect(form.amountInput).toHaveValue("Rp 2.500");
    });

    for (const { amount, message } of [
      { amount: "", message: "Nominal wajib diisi" },
      { amount: "0", message: "Nominal harus lebih dari 0" },
      { amount: "1000000001", message: "Nominal maksimal Rp 1.000.000.000" },
    ]) {
      test(`nominal tidak valid ditolak: ${JSON.stringify(amount)}`, async ({
        db,
      }) => {
        await form.open();
        await form.fill({ amount, category: "belanja", note: "Belanja" });
        await form.submit();

        await expect(form.amountError).toHaveText(message);
        await expect(form.amountInput).toHaveAttribute("aria-invalid", "true");
        await expect(form.category("belanja")).toHaveAttribute(
          "aria-checked",
          "true",
        );
        await expect(form.noteInput).toHaveValue("Belanja");
        await expect(form.dialog).toBeVisible();
        expect(await db.getTransactions(user.id)).toHaveLength(0);
      });
    }

    test("batas atas Rp 1.000.000.000 masih diterima", async ({ db }) => {
      await form.addExpense({ amount: "1000000000", category: "tagihan" });
      await expect(form.toast(MESSAGES.saved)).toBeVisible();
      await expect(home.expenseTotal).toHaveText("Rp 1.000.000.000");
      expect((await db.getTransactions(user.id))[0].amount).toBe(1_000_000_000);
    });

    test("kategori wajib dipilih", async ({ db }) => {
      await form.open();
      await form.fill({ amount: "50000" });
      await form.submit();

      await expect(form.categoryError).toHaveText(MESSAGES.chooseCategory);
      await expect(form.amountInput).toHaveValue("Rp 50.000");
      expect(await db.getTransactions(user.id)).toHaveLength(0);

      // Pesan hilang setelah kategori dipilih.
      await form.category("lainnya").click();
      await expect(form.categoryError).toBeHidden();
    });

    test("tanggal setelah hari ini tidak bisa dipilih", async ({ db }) => {
      await form.open();
      await expect(form.datePicker).toHaveAttribute("max", jakartaDate(0));

      // Walau diisi paksa, tanggal besok ditolak.
      await form.fill({
        amount: "20000",
        category: "belanja",
        date: jakartaDate(1),
      });
      await form.submit();
      await expect(form.dateError).toHaveText(MESSAGES.dateFuture);
      await expect(form.amountInput).toHaveValue("Rp 20.000");
      expect(await db.getTransactions(user.id)).toHaveLength(0);
    });

    test("catatan dibatasi 100 karakter", async () => {
      await form.open();
      await form.noteInput.pressSequentially("a".repeat(120));

      await expect(form.noteInput).toHaveValue("a".repeat(100));
      await expect(form.noteCounter).toHaveText("100/100");
    });

    test("hanya kategori pengeluaran aktif milik pengguna yang tampil", async ({
      page,
      db,
    }) => {
      await db.archiveCategory(user.id, "Hiburan");
      await page.reload();
      await form.open();

      await expect(form.categoryOptions).toHaveCount(EXPENSE_SLUGS.length - 1);
      await expect(form.category("hiburan")).toHaveCount(0);
      await expect(form.category("gaji")).toHaveCount(0);
      await expect(form.category("makan-minum")).toBeVisible();
    });
  });

  test.describe("@error-handling", () => {
    test("tombol simpan ditekan dua kali → hanya satu transaksi", async ({
      page,
      db,
    }) => {
      await delayServerActions(page, 800);
      await form.open();
      await form.fill({
        amount: "30000",
        category: "makan-minum",
        note: "Double",
      });

      await form.submitButton.evaluate((button: HTMLButtonElement) => {
        button.click();
        button.click();
      });
      await expect(form.submitButton).toBeDisabled();
      await form.submitButton.click({ force: true }).catch(() => {});

      await expect(form.toast(MESSAGES.saved)).toBeVisible();
      await expect(home.item("Double")).toHaveCount(1);
      expect(await db.getTransactions(user.id)).toHaveLength(1);
    });

    test("gagal menyimpan karena koneksi terputus → data tetap, bisa coba lagi", async ({
      page,
      db,
    }) => {
      await form.open();
      await form.fill({
        amount: "45000",
        category: "tagihan",
        note: "Pulsa",
      });

      await abortServerActions(page);
      await form.submit();

      await expect(form.alert).toHaveText(MESSAGES.system);
      await expect(form.amountInput).toHaveValue("Rp 45.000");
      await expect(form.category("tagihan")).toHaveAttribute(
        "aria-checked",
        "true",
      );
      await expect(form.noteInput).toHaveValue("Pulsa");
      await expect(form.submitButton).toBeEnabled();
      expect(await db.getTransactions(user.id)).toHaveLength(0);

      // Koneksi pulih → coba lagi.
      await page.unrouteAll({ behavior: "wait" });
      await form.submit();
      await expect(form.toast(MESSAGES.saved)).toBeVisible();
      await expect(home.item("Pulsa")).toBeVisible();
      expect(await db.getTransactions(user.id)).toHaveLength(1);
    });

    test("membatalkan form yang sudah terisi meminta konfirmasi", async () => {
      await form.open();
      await form.fill({ amount: "10000" });
      await form.cancelButton.click();

      await expect(form.discardDialog).toBeVisible();
      await expect(form.discardDialog).toContainText(MESSAGES.discard);

      // Lanjut mengisi → data tetap.
      await form.discardCancel.click();
      await expect(form.discardDialog).toBeHidden();
      await expect(form.amountInput).toHaveValue("Rp 10.000");

      // Escape juga meminta konfirmasi; Buang → form tertutup & kosong lagi.
      await form.page.keyboard.press("Escape");
      await expect(form.discardDialog).toBeVisible();
      await form.discardConfirm.click();
      await expect(form.dialog).toBeHidden();
      await expect(home.recentEmpty).toBeVisible();

      await form.open();
      await expect(form.amountInput).toHaveValue("");
    });

    test("form kosong langsung tertutup tanpa konfirmasi", async () => {
      await form.open();
      await form.cancelButton.click();
      await expect(form.dialog).toBeHidden();
      await expect(form.discardDialog).toBeHidden();
    });
  });

  test.describe("@security", () => {
    test("pengeluaran tidak terlihat oleh pengguna lain", async ({
      page,
      createUser,
      loginAs,
    }) => {
      await form.addExpense({
        amount: "25000",
        category: "makan-minum",
        note: "Makan siang budi",
      });
      await expect(home.item("Makan siang budi")).toBeVisible();

      await new AppShell(page).logout();
      const ani = await createUser("ani", "Ani Wijaya");
      await loginAs(ani);
      await home.goto();

      await expect(home.recentEmpty).toBeVisible();
      await expect(home.item("Makan siang budi")).toHaveCount(0);
      await expect(home.expenseTotal).toHaveText("Rp 0");
      await page.goto("/transactions");
      await expect(page.getByText("Makan siang budi")).toHaveCount(0);
    });
  });

  test.describe("@ux", () => {
    test("default: fokus di Nominal, tanggal hari ini, belum ada kategori terpilih", async () => {
      await form.open();

      await expect(form.title).toHaveText("Catat Pengeluaran");
      await expect(form.amountInput).toBeFocused();
      await expect(form.amountInput).toHaveAttribute("inputmode", "numeric");
      await expect(form.typeExpense).toHaveAttribute("aria-checked", "true");
      await expect(form.typeIncome).toBeDisabled(); // E02-US02
      await expect(form.categoryOptions).toHaveCount(EXPENSE_SLUGS.length);
      for (const slug of EXPENSE_SLUGS) {
        await expect(form.category(slug)).toHaveAttribute(
          "aria-checked",
          "false",
        );
      }
      await expect(form.datePicker).toHaveValue(jakartaDate(0));
      await expect(form.dateLabel).toHaveText(/^Hari ini, /);
      await expect(form.noteCounter).toHaveText("0/100");
      await expect(form.submitButton).toHaveText("Simpan");
      await expect(form.submitButton).toBeEnabled();
    });

    test("hanya satu kategori yang aktif", async () => {
      await form.open();
      await form.category("belanja").click();
      await form.category("tagihan").click();
      await expect(form.category("tagihan")).toHaveAttribute(
        "aria-checked",
        "true",
      );
      await expect(form.category("belanja")).toHaveAttribute(
        "aria-checked",
        "false",
      );
    });

    test("loading: tombol Menyimpan... nonaktif dan field terkunci", async ({
      page,
    }) => {
      await delayServerActions(page, 1500);
      await form.open();
      await form.fill({ amount: "12000", category: "lainnya" });
      await form.submit();

      await expect(form.submitButton).toHaveText("Menyimpan...");
      await expect(form.submitButton).toBeDisabled();
      await expect(form.amountInput).toBeDisabled();
      await expect(form.cancelButton).toBeDisabled();
      await expect(form.toast(MESSAGES.saved)).toBeVisible();
    });

    test("bottom sheet di HP, dialog di tengah layar di desktop", async ({
      page,
    }, testInfo) => {
      await form.open();
      const viewport = page.viewportSize()!;
      const box = async () => (await form.dialog.boundingBox())!;

      // Tunggu animasi buka selesai.
      if (testInfo.project.name === "mobile") {
        await expect
          .poll(async () => Math.round((await box()).y + (await box()).height))
          .toBe(viewport.height);
        expect((await box()).width).toBeCloseTo(viewport.width, 0);
      } else {
        await expect
          .poll(async () => {
            const b = await box();
            return Math.round(b.y + b.height / 2);
          })
          .toBe(viewport.height / 2);
        const b = await box();
        expect(b.width).toBeLessThan(viewport.width / 2);
        expect(Math.round(b.x + b.width / 2)).toBe(viewport.width / 2);
      }
      // Tombol Simpan terlihat tanpa scroll.
      await expect(form.submitButton).toBeInViewport();
    });
  });
});
