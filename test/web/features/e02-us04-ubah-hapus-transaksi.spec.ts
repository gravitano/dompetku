/**
 * E02-US04 Ubah dan hapus transaksi — docs/features/phase-01-mvp/
 * e-02---pencatatan-transaksi/e02-us04--ubah-hapus-transaksi---testing.md
 *
 * Skenario @smoke "Mengubah nominal transaksi" dan "Menghapus transaksi" ada di
 * `test/web/smoke/ubah-hapus-transaksi.spec.ts`. Skenario "request langsung"
 * (ubah/hapus transaksi user lain lewat Server Action) diuji di Vitest
 * (`src/modules/transactions/actions.test.ts`).
 *
 * Data uji: akun baru per test (`createUser`), transaksi di-insert lewat
 * fixture `db`. Determinisme tanggal: Background "30 Sep 2026" ditempatkan di
 * tanggal 28 **bulan lalu** (`BASE`) dan daftar dibuka dengan `?month=BASE`,
 * sehingga hasilnya sama di tanggal berapa pun (termasuk tanggal 1).
 */
import type { Page } from "@playwright/test";

import { expect, test, type CreatedUser } from "../fixtures";
import type { SeedTransaction, TestDb } from "../fixtures/db";
import {
  delayServerActions,
  failServerActions,
} from "../fixtures/server-actions";
import { HomePage, jakartaDate } from "../pages/home-page";
import { TransactionDetailPage } from "../pages/transaction-detail";
import {
  lastDayOfMonth,
  monthLabel,
  rupiah,
  shiftMonth,
  TransactionsPage,
} from "../pages/transactions-page";

const BASE = shiftMonth(jakartaDate(0).slice(0, 7), -1);
const PREVIOUS = shiftMonth(BASE, -1);
const on = (day: number) => `${BASE}-${String(day).padStart(2, "0")}`;

const MAKAN_SIANG: SeedTransaction = {
  date: on(28),
  type: "EXPENSE",
  category: "Makan & Minum",
  amount: 25_000,
  note: "Makan siang",
};
/** Transaksi lain di bulan yang sama agar total ringkasan tidak nol. */
const OJEK: SeedTransaction = {
  date: on(10),
  type: "EXPENSE",
  category: "Transportasi",
  amount: 18_000,
  note: "Ojek",
};
const BASE_EXPENSE = MAKAN_SIANG.amount + OJEK.amount;

async function transactionOf(db: TestDb, userId: string, note: string) {
  const found = (await db.getTransactions(userId)).find((t) => t.note === note);
  if (!found) throw new Error(`Transaksi "${note}" tidak ada`);
  return found;
}

test.describe("Ubah dan hapus transaksi", () => {
  let user: CreatedUser;
  let list: TransactionsPage;
  let detail: TransactionDetailPage;

  test.beforeEach(async ({ page, db, createUser, loginAs }) => {
    user = await createUser("budi");
    await db.insertTransactions(user.id, [OJEK, MAKAN_SIANG]);
    await loginAs(user);
    list = new TransactionsPage(page);
    detail = new TransactionDetailPage(page);
  });

  /** Background: tab Transaksi (periode BASE) lalu buka "Makan siang". */
  async function openMakanSiang(page: Page) {
    await list.goto(`?month=${BASE}`);
    await list.row("Makan siang").click();
    await expect(detail.sheet).toBeVisible();
    await expect(page).toHaveURL(/\/transactions\/[0-9a-f-]{36}\?from=list/);
  }

  test("detail berisi form terisi: jenis, nominal, kategori, tanggal, catatan", async ({
    page,
  }) => {
    await openMakanSiang(page);
    const { form } = detail;

    await expect(detail.title).toHaveText("Detail Transaksi");
    await expect(form.typeExpense).toHaveAttribute("aria-checked", "true");
    await expect(form.amountInput).toHaveValue("Rp 25.000");
    await expect(form.category("makan-minum")).toHaveAttribute(
      "aria-checked",
      "true",
    );
    await expect(form.datePicker).toHaveValue(MAKAN_SIANG.date);
    await expect(form.noteInput).toHaveValue("Makan siang");
    await expect(detail.recordedAt).toHaveText(
      /^Dicatat \d{1,2} \S+ \d{4}, \d{2}[.:]\d{2}$/,
    );
    await expect(detail.deleteButton).toBeEnabled();
    // Daftar tetap di belakang sheet (modal di atas halaman asal).
    await expect(list.monthLabel).toBeAttached();
  });

  test("mengubah catatan & kategori tersimpan dan langsung tampil di daftar", async ({
    page,
    db,
  }) => {
    await openMakanSiang(page);
    await detail.form.category("belanja").click();
    await detail.form.noteInput.fill("Makan malam");
    await detail.save();

    await expect(detail.form.toast("Perubahan tersimpan")).toBeVisible();
    await expect(detail.sheet).toBeHidden();
    await expect(page).toHaveURL(
      (url) =>
        url.pathname === "/transactions" &&
        url.searchParams.get("month") === BASE,
    );
    const row = list.row("Makan malam");
    await expect(row.getByTestId("transaction-category")).toHaveText("Belanja");
    await expect(list.row("Makan siang")).toHaveCount(0);
    const stored = await transactionOf(db, user.id, "Makan malam");
    expect(stored).toMatchObject({ amount: 25_000, categoryName: "Belanja" });
  });

  test("memindahkan transaksi ke bulan sebelumnya", async ({ page }) => {
    const target = lastDayOfMonth(PREVIOUS);
    await openMakanSiang(page);
    await detail.form.datePicker.fill(target);
    await detail.save();

    await expect(detail.form.toast("Perubahan tersimpan")).toBeVisible();
    await expect(list.monthLabel).toHaveText(monthLabel(BASE));
    await expect(list.row("Ojek")).toBeVisible();
    await expect(list.row("Makan siang")).toHaveCount(0);
    await expect(list.summaryExpense).toHaveText(rupiah(OJEK.amount));

    await list.monthPrev.click();
    await expect(list.monthLabel).toHaveText(monthLabel(PREVIOUS));
    await expect(list.row("Makan siang")).toBeVisible();
    await expect(
      list.group(target).getByTestId("transaction-note"),
    ).toContainText(["Makan siang"]);
  });

  test("mengubah jenis transaksi menjadi pemasukan", async ({ page, db }) => {
    await openMakanSiang(page);
    const { form } = detail;
    await form.selectType("income");

    // Kategori dikosongkan; grid berganti ke kategori pemasukan.
    await expect(
      form.categoryGrid.locator('[aria-checked="true"]'),
    ).toHaveCount(0);
    await expect(form.category("gaji")).toBeVisible();
    await detail.save();
    await expect(form.categoryError).toHaveText("Pilih kategori");

    await form.category("lainnya").click();
    await detail.save();

    await expect(form.toast("Perubahan tersimpan")).toBeVisible();
    await expect(
      list.row("Makan siang").getByTestId("transaction-amount"),
    ).toHaveText(/^\+ .*Rp 25\.000$/);
    await expect(list.summaryIncome).toHaveText(rupiah(25_000));
    await expect(list.summaryExpense).toHaveText(rupiah(OJEK.amount));
    expect(await transactionOf(db, user.id, "Makan siang")).toMatchObject({
      type: "INCOME",
      categoryName: "Lainnya",
    });
  });

  test("membatalkan penghapusan", async ({ page, db }) => {
    await openMakanSiang(page);
    await detail.deleteButton.click();
    await expect(detail.deleteDialog).toBeVisible();
    await detail.confirmCancel.click();

    await expect(detail.deleteDialog).toBeHidden();
    await expect(detail.sheet).toBeVisible();
    await detail.close();
    await expect(list.row("Makan siang")).toBeVisible();
    expect(await transactionOf(db, user.id, "Makan siang")).toBeTruthy();
  });

  test("tombol Simpan perubahan nonaktif tanpa perubahan", async ({ page }) => {
    await openMakanSiang(page);
    await expect(detail.updateButton).toHaveText("Simpan perubahan");
    await expect(detail.updateButton).toBeDisabled();

    // Aktif setelah ada perubahan, nonaktif lagi bila dikembalikan.
    await detail.form.noteInput.fill("Makan siang kantor");
    await expect(detail.updateButton).toBeEnabled();
    await detail.form.noteInput.fill("Makan siang");
    await expect(detail.updateButton).toBeDisabled();
  });

  test("nominal tidak valid saat mengubah", async ({ page, db }) => {
    await openMakanSiang(page);
    await detail.form.amountInput.fill("0");
    await detail.save();

    await expect(detail.form.amountError).toHaveText(
      "Nominal harus lebih dari 0",
    );
    await expect(detail.sheet).toBeVisible();
    expect((await transactionOf(db, user.id, "Makan siang")).amount).toBe(
      25_000,
    );
  });

  test("menutup detail: langsung bila tanpa perubahan, konfirmasi bila ada perubahan", async ({
    page,
    db,
  }) => {
    // Tanpa perubahan → langsung tertutup.
    await openMakanSiang(page);
    await detail.close();
    await expect(detail.sheet).toBeHidden();
    await expect(detail.form.discardDialog).toBeHidden();

    // Dengan perubahan → "Buang perubahan?".
    await list.row("Makan siang").click();
    await expect(detail.sheet).toBeVisible();
    await detail.form.noteInput.fill("Makan malam");
    await detail.close();
    await expect(detail.form.discardDialog).toBeVisible();
    await expect(detail.form.discardDialog).toContainText("Buang perubahan?");

    // Lanjut mengisi → perubahan tetap ada.
    await detail.form.discardCancel.click();
    await expect(detail.form.discardDialog).toBeHidden();
    await expect(detail.form.noteInput).toHaveValue("Makan malam");

    // Tutup lewat Escape juga meminta konfirmasi; Buang → data tidak berubah.
    await page.keyboard.press("Escape");
    await expect(detail.form.discardDialog).toBeVisible();
    await detail.form.discardConfirm.click();
    await expect(detail.sheet).toBeHidden();
    await expect(list.row("Makan siang")).toBeVisible();
    expect((await transactionOf(db, user.id, "Makan siang")).note).toBe(
      "Makan siang",
    );
  });

  test("transaksi dengan kategori terarsip", async ({ page, db }) => {
    await db.archiveCategory(user.id, "Makan & Minum");
    await openMakanSiang(page);
    const archived = detail.form.category("makan-minum");

    await expect(archived).toHaveAttribute("aria-checked", "true");
    await expect(archived.getByTestId("category-archived-badge")).toHaveText(
      "Diarsipkan",
    );
    await detail.form.amountInput.fill("27000");
    await detail.save();

    await expect(detail.form.toast("Perubahan tersimpan")).toBeVisible();
    expect(await transactionOf(db, user.id, "Makan siang")).toMatchObject({
      amount: 27_000,
      categoryName: "Makan & Minum",
    });
  });

  test("kategori terarsip tidak bisa dipilih ulang setelah diganti", async ({
    page,
    db,
  }) => {
    await db.archiveCategory(user.id, "Makan & Minum");
    await openMakanSiang(page);
    const { form } = detail;
    await expect(form.category("makan-minum")).toBeVisible();

    await form.category("belanja").click();
    await expect(form.category("makan-minum")).toHaveCount(0);
    await expect(detail.archivedBadge).toHaveCount(0);

    // Ganti jenis lalu kembali: kategori terarsip tetap tidak muncul.
    await form.selectType("income");
    await form.selectType("expense");
    await expect(form.category("makan-minum")).toHaveCount(0);
  });

  test("loading saat menyimpan: tombol spinner & input nonaktif", async ({
    page,
  }) => {
    await openMakanSiang(page);
    await delayServerActions(page, 1_500);
    await detail.form.amountInput.fill("30000");
    await detail.save();

    await expect(detail.updateButton).toBeDisabled();
    await expect(detail.updateButton).toHaveText("Menyimpan...");
    await expect(detail.form.amountInput).toBeDisabled();
    await expect(detail.deleteButton).toBeDisabled();
    await expect(detail.form.toast("Perubahan tersimpan")).toBeVisible();
  });

  test("gagal menyimpan perubahan", async ({ page, db }) => {
    await openMakanSiang(page);
    await failServerActions(page);
    await detail.form.amountInput.fill("30000");
    await detail.save();

    await expect(detail.form.alert).toHaveText(
      "Gagal menyimpan perubahan. Coba lagi.",
    );
    await expect(detail.form.amountInput).toHaveValue("Rp 30.000");
    await expect(detail.updateButton).toBeEnabled();
    expect((await transactionOf(db, user.id, "Makan siang")).amount).toBe(
      25_000,
    );

    // Koneksi pulih → Simpan lagi berhasil.
    await page.unrouteAll({ behavior: "ignoreErrors" });
    await detail.save();
    await expect(detail.form.toast("Perubahan tersimpan")).toBeVisible();
    expect((await transactionOf(db, user.id, "Makan siang")).amount).toBe(
      30_000,
    );
  });

  test("gagal menghapus transaksi", async ({ page, db }) => {
    await openMakanSiang(page);
    await failServerActions(page);
    await detail.deleteAndConfirm();

    await expect(detail.deleteError).toHaveText(
      "Gagal menghapus transaksi. Coba lagi.",
    );
    await expect(detail.confirmDelete).toBeEnabled();
    await detail.confirmCancel.click();
    await expect(detail.sheet).toBeVisible();
    await expect(detail.form.amountInput).toHaveValue("Rp 25.000");
    await page.unrouteAll({ behavior: "ignoreErrors" });
    await detail.close();

    await expect(list.row("Makan siang")).toBeVisible();
    await expect(list.summaryExpense).toHaveText(rupiah(BASE_EXPENSE));
    expect(await transactionOf(db, user.id, "Makan siang")).toBeTruthy();
  });

  test("detail via tautan langsung: ubah tersimpan lalu kembali ke daftar bulan transaksi", async ({
    page,
    db,
  }) => {
    const { id } = await transactionOf(db, user.id, "Makan siang");
    await page.goto(`/transactions/${id}`);
    await expect(detail.sheet).toBeVisible();
    await expect(detail.form.amountInput).toHaveValue("Rp 25.000");

    await detail.form.amountInput.fill("30000");
    await detail.save();
    await expect(detail.form.toast("Perubahan tersimpan")).toBeVisible();
    await expect(page).toHaveURL(
      (url) =>
        url.pathname === "/transactions" &&
        url.searchParams.get("month") === BASE,
    );
    await expect(
      list.row("Makan siang").getByTestId("transaction-amount"),
    ).toHaveText(/^− .*Rp 30\.000$/);
  });

  test("hapus dari tautan langsung → daftar, tanpa halaman tidak ditemukan", async ({
    page,
    db,
  }) => {
    const { id } = await transactionOf(db, user.id, "Makan siang");
    await page.goto(`/transactions/${id}?from=list&month=${BASE}`);
    await detail.deleteAndConfirm();

    await expect(detail.form.toast("Transaksi dihapus")).toBeVisible();
    await expect(page).toHaveURL(
      (url) =>
        url.pathname === "/transactions" &&
        url.searchParams.get("month") === BASE,
    );
    await expect(detail.notFound).toHaveCount(0);
    await expect(list.row("Makan siang")).toHaveCount(0);

    // Tautan transaksi yang sudah dihapus → tidak ditemukan.
    await page.goto(`/transactions/${id}`);
    await expect(detail.notFoundTitle).toHaveText("Transaksi tidak ditemukan");
    await detail.notFoundBack.click();
    await expect(page).toHaveURL((url) => url.pathname === "/transactions");
  });

  test("tap transaksi terbaru di Beranda membuka detail, tutup kembali ke Beranda", async ({
    page,
  }) => {
    const home = new HomePage(page);
    await home.goto();
    await home.item("Makan siang").getByRole("link").click();

    await expect(detail.sheet).toBeVisible();
    await expect(page).toHaveURL(/\/transactions\/[0-9a-f-]{36}\?from=home$/);
    await expect(detail.form.noteInput).toHaveValue("Makan siang");
    await detail.close();
    await expect(detail.sheet).toBeHidden();
    await expect(page).toHaveURL((url) => url.pathname === "/");

    // Ubah dari Beranda → toast, kembali ke Beranda dengan data terbaru.
    await home.item("Makan siang").getByRole("link").click();
    await expect(detail.sheet).toBeVisible();
    await detail.form.amountInput.fill("26000");
    await detail.save();
    await expect(detail.form.toast("Perubahan tersimpan")).toBeVisible();
    await expect(page).toHaveURL((url) => url.pathname === "/");
    await expect(
      home.item("Makan siang").getByTestId("transaction-amount"),
    ).toHaveText(/Rp 26\.000$/);
  });

  test("refresh saat detail terbuka tetap menampilkan detail", async ({
    page,
  }) => {
    await openMakanSiang(page);
    await page.reload();
    await expect(detail.sheet).toBeVisible();
    await expect(detail.form.noteInput).toHaveValue("Makan siang");
    await detail.close();
    await expect(page).toHaveURL(
      (url) =>
        url.pathname === "/transactions" &&
        url.searchParams.get("month") === BASE,
    );
  });

  test.describe("keamanan", () => {
    let aniTransactionId: string;
    let ani: CreatedUser;

    test.beforeEach(async ({ db, createUser }) => {
      ani = await createUser("ani", "Ani Wijaya");
      await db.insertTransactions(ani.id, [
        { ...MAKAN_SIANG, amount: 99_000, note: "Makan Ani" },
      ]);
      aniTransactionId = (await transactionOf(db, ani.id, "Makan Ani")).id;
    });

    test("tidak bisa membuka transaksi milik pengguna lain", async ({
      page,
      db,
    }) => {
      await page.goto(`/transactions/${aniTransactionId}`);

      await expect(detail.notFound).toBeVisible();
      await expect(detail.notFoundTitle).toHaveText(
        "Transaksi tidak ditemukan",
      );
      await expect(detail.sheet).toHaveCount(0);
      await expect(page.getByText("Makan Ani")).toHaveCount(0);
      await expect(page.getByText("99.000")).toHaveCount(0);
      expect(await transactionOf(db, ani.id, "Makan Ani")).toMatchObject({
        amount: 99_000,
      });

      // Id tidak valid juga "tidak ditemukan".
      await page.goto("/transactions/trx-ani-1");
      await expect(detail.notFoundTitle).toHaveText(
        "Transaksi tidak ditemukan",
      );
    });
  });
});
