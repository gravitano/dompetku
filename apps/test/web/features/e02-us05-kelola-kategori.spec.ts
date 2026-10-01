/**
 * E02-US05 Kelola kategori — docs/features/phase-01-mvp/
 * e-02---pencatatan-transaksi/e02-us05--kelola-kategori---testing.md
 *
 * Skenario @smoke "Menambah kategori pengeluaran baru" ada di
 * `test/web/smoke/kelola-kategori.spec.ts`. Skenario "request langsung"
 * (ubah/arsip/hapus kategori user lain, catat transaksi dengan kategori user
 * lain lewat Server Action) diuji di Vitest
 * (`src/modules/categories/actions.test.ts`,
 * `src/modules/transactions/actions.test.ts`).
 *
 * Data uji: akun baru per test (`createUser`) dengan kategori bawaan dan 12
 * transaksi "Makan & Minum" bertanggal tetap 1–12 Sep 2026 (tidak relatif hari
 * ini); daftar transaksi dibuka dengan `?month=2026-09`.
 */
import type { Page } from "@playwright/test";

import { expect, test, type CreatedUser } from "../fixtures";
import type { SeedTransaction, TestDb } from "../fixtures/db";
import { failServerActions } from "../fixtures/server-actions";
import { CategoriesPage } from "../pages/categories-page";
import { TransactionDetailPage } from "../pages/transaction-detail";
import { TransactionFormPage } from "../pages/transaction-form";
import { TransactionsPage } from "../pages/transactions-page";

const MONTH = "2026-09";
const MAKAN: SeedTransaction[] = Array.from({ length: 12 }, (_, i) => ({
  date: `${MONTH}-${String(i + 1).padStart(2, "0")}`,
  type: "EXPENSE",
  category: "Makan & Minum",
  amount: 10_000 + i * 1_000,
  note: `Makan ${i + 1}`,
}));

const MESSAGES = {
  created: "Kategori ditambahkan",
  updated: "Kategori diperbarui",
  archived: "Kategori diarsipkan",
  restored: "Kategori diaktifkan",
  deleted: "Kategori dihapus",
  nameRequired: "Nama wajib diisi",
  nameTaken: "Nama kategori sudah ada",
  nameTooLong: "Nama maksimal 30 karakter",
  iconRequired: "Pilih ikon",
  lastActive: "Minimal harus ada 1 kategori aktif",
  systemError: "Gagal menyimpan. Coba lagi.",
} as const;

/** Buka form catat transaksi (FAB di Beranda) pada jenis tertentu. */
async function openTransactionForm(
  page: Page,
  type: "expense" | "income" = "expense",
) {
  const form = new TransactionFormPage(page);
  await page.goto("/");
  await form.open();
  if (type === "income") await form.selectType("income");
  return form;
}

async function categoryOf(
  db: TestDb,
  userId: string,
  name: string,
  type: "EXPENSE" | "INCOME" = "EXPENSE",
) {
  return (await db.getCategories(userId)).find(
    (c) => c.name === name && c.type === type,
  );
}

test.describe("Kelola kategori", () => {
  let user: CreatedUser;
  let categories: CategoriesPage;

  test.beforeEach(async ({ page, db, createUser, loginAs }) => {
    user = await createUser("budi");
    await db.insertTransactions(user.id, MAKAN);
    await loginAs(user);
    categories = new CategoriesPage(page);
  });

  test.describe("@happy-path", () => {
    test("halaman Kategori dari menu akun: tab, daftar aktif abjad + jumlah transaksi", async ({
      page,
    }) => {
      await page.goto("/");
      await categories.openFromAccountMenu();

      await expect(categories.title).toHaveText("Kategori");
      await expect(categories.tab("expense")).toHaveAttribute(
        "aria-selected",
        "true",
      );
      await expect(await categories.activeNames()).toEqual([
        "Belanja",
        "Hiburan",
        "Kesehatan",
        "Lainnya",
        "Makan & Minum",
        "Tagihan",
        "Transportasi",
      ]);
      await expect(
        categories.activeRow("makan-minum").getByTestId("category-row-count"),
      ).toHaveText("12 transaksi");
      await expect(
        categories.activeRow("belanja").getByTestId("category-row-count"),
      ).toHaveText("0 transaksi");
      // Tidak ada kategori terarsip → bagian Diarsipkan disembunyikan.
      await expect(categories.archivedSection).toBeHidden();

      // UX-02: tab Pemasukan menampilkan kategori pemasukan (URL ikut).
      await categories.selectTab("income");
      await expect(page).toHaveURL(/\/categories\?type=income$/);
      await expect(await categories.activeNames()).toEqual([
        "Bonus",
        "Gaji",
        "Hadiah",
        "Lainnya",
      ]);
      await page.reload();
      await expect(categories.tab("income")).toHaveAttribute(
        "aria-selected",
        "true",
      );
    });

    test("form tambah: fokus di Nama, counter n/30, pratinjau ikon terpilih", async () => {
      await categories.goto();
      await categories.openAdd();

      await expect(categories.formTitle).toHaveText("Tambah Kategori");
      await expect(categories.nameInput).toBeFocused();
      await expect(categories.nameCounter).toHaveText("0/30");
      await categories.nameInput.fill("Kopi");
      await expect(categories.nameCounter).toHaveText("4/30");

      await categories.iconOption("coffee").click();
      await expect(categories.iconOption("coffee")).toHaveAttribute(
        "aria-checked",
        "true",
      );
      await expect(categories.iconPreview).toHaveAttribute(
        "data-icon",
        "coffee",
      );
      await categories.iconOption("car").click();
      await expect(categories.iconOption("coffee")).toHaveAttribute(
        "aria-checked",
        "false",
      );
      await expect(categories.iconPreview).toHaveAttribute("data-icon", "car");

      await categories.cancelButton.click();
      await expect(categories.sheet).toBeHidden();
    });

    test("menambah kategori pemasukan dari tab Pemasukan", async ({
      page,
      db,
    }) => {
      await categories.goto("income");
      await categories.add("Freelance", "briefcase");

      await expect(categories.toast(MESSAGES.created)).toBeVisible();
      await expect(categories.activeRow("freelance")).toBeVisible();
      expect(
        await categoryOf(db, user.id, "Freelance", "INCOME"),
      ).toMatchObject({ icon: "briefcase", archived: false });

      const form = await openTransactionForm(page, "income");
      await expect(form.category("freelance")).toBeVisible();
    });

    test("mengubah nama dan ikon kategori yang sudah dipakai", async ({
      page,
      db,
    }) => {
      await categories.goto();
      await categories.openCategory("makan-minum");
      await expect(categories.formTitle).toHaveText("Ubah Kategori");
      await expect(categories.nameInput).toHaveValue("Makan & Minum");
      await expect(categories.iconOption("utensils")).toHaveAttribute(
        "aria-checked",
        "true",
      );

      await categories.nameInput.fill("Makan");
      await categories.iconOption("coffee").click();
      await categories.submitButton.click();

      await expect(categories.toast(MESSAGES.updated)).toBeVisible();
      await expect(categories.sheet).toBeHidden();
      await expect(
        categories.activeRow("makan").getByTestId("category-row-count"),
      ).toHaveText("12 transaksi");
      await expect(categories.activeRow("makan-minum")).toHaveCount(0);
      expect(await categoryOf(db, user.id, "Makan")).toMatchObject({
        icon: "coffee",
      });

      // Ke-12 transaksi sebelumnya menampilkan kategori "Makan".
      const list = new TransactionsPage(page);
      await list.goto(`?month=${MONTH}`);
      await expect(list.rows).toHaveCount(12);
      await expect(list.rows.getByTestId("transaction-category")).toHaveText(
        Array(12).fill("Makan"),
      );

      // Pilihan form catat ikut diperbarui.
      await list.page.getByTestId("fab-add-transaction").click();
      const form = new TransactionFormPage(page);
      await expect(form.category("makan")).toBeVisible();
      await expect(form.category("makan-minum")).toHaveCount(0);
    });

    test("mengarsipkan kategori yang sudah dipakai", async ({ page, db }) => {
      await categories.goto();
      await categories.openCategory("makan-minum");

      await expect(categories.deleteButton).toHaveCount(0);
      await expect(categories.moreButton).toHaveCount(0);
      await expect(categories.archiveHelp).toContainText(
        "Kategori ini dipakai di 12 transaksi",
      );
      await categories.archiveButton.click();

      await expect(categories.toast(MESSAGES.archived)).toBeVisible();
      await expect(categories.sheet).toBeHidden();
      await expect(categories.activeRow("makan-minum")).toHaveCount(0);
      await expect(categories.archivedToggle).toHaveText(/Diarsipkan \(1\)/);
      await expect(categories.archivedRow("makan-minum")).toBeVisible();
      await expect(categories.archivedRow("makan-minum")).toContainText(
        "12 transaksi",
      );
      expect(await categoryOf(db, user.id, "Makan & Minum")).toMatchObject({
        archived: true,
      });

      // Tidak tersedia di form catat pengeluaran.
      const form = await openTransactionForm(page);
      await expect(form.category("belanja")).toBeVisible();
      await expect(form.category("makan-minum")).toHaveCount(0);

      // Transaksi lama tetap menampilkan kategori "Makan & Minum".
      const list = new TransactionsPage(page);
      await list.goto(`?month=${MONTH}`);
      await expect(
        list.row("Makan 1").getByTestId("transaction-category"),
      ).toHaveText("Makan & Minum · Diarsipkan");

      // Tetap tersedia di filter daftar transaksi.
      await list.applyFilter({ categories: ["makan-minum"] });
      await expect(list.chip("makan-minum")).toBeVisible();
      await expect(list.rows).toHaveCount(12);

      // Detail transaksi lama: kategori tetap tampil berlabel "Diarsipkan".
      await list.row("Makan 1").click();
      const detail = new TransactionDetailPage(page);
      await expect(detail.sheet).toBeVisible();
      await expect(detail.form.category("makan-minum")).toHaveAttribute(
        "aria-checked",
        "true",
      );
      await expect(detail.archivedBadge).toBeVisible();
    });

    test("mengarsipkan kategori yang belum dipakai lewat menu ⋯", async ({
      db,
    }) => {
      await categories.goto();
      await categories.openCategory("hiburan");
      await expect(categories.archiveHelp).toHaveCount(0);
      await categories.moreButton.click();
      await categories.archiveButton.click();

      await expect(categories.toast(MESSAGES.archived)).toBeVisible();
      await expect(categories.archivedRow("hiburan")).toBeVisible();
      expect(await categoryOf(db, user.id, "Hiburan")).toMatchObject({
        archived: true,
      });
    });

    test("mengaktifkan kembali kategori terarsip", async ({ page, db }) => {
      await db.archiveCategory(user.id, "Makan & Minum");
      await categories.goto();

      await expect(categories.archivedToggle).toHaveAttribute(
        "aria-expanded",
        "false",
      );
      await categories.expandArchived();
      await categories.restoreButton("makan-minum").click();

      await expect(categories.toast(MESSAGES.restored)).toBeVisible();
      await expect(categories.activeRow("makan-minum")).toBeVisible();
      await expect(categories.archivedSection).toBeHidden();
      expect(await categoryOf(db, user.id, "Makan & Minum")).toMatchObject({
        archived: false,
      });

      const form = await openTransactionForm(page);
      await expect(form.category("makan-minum")).toBeVisible();
    });

    test("menghapus kategori yang belum pernah dipakai", async ({ db }) => {
      await db.createCategory(user.id, { name: "Kopi", icon: "coffee" });
      await categories.goto();
      await categories.openCategory("kopi");

      await expect(categories.archiveHelp).toHaveCount(0);
      await categories.deleteButton.click();
      await expect(categories.deleteDialog).toBeVisible();
      await expect(categories.deleteTitle).toHaveText("Hapus kategori Kopi?");

      // Batal → kembali ke form, kategori tetap ada.
      await categories.confirmCancel.click();
      await expect(categories.deleteDialog).toBeHidden();
      await expect(categories.sheet).toBeVisible();

      await categories.deleteButton.click();
      await categories.confirmDelete.click();
      await expect(categories.toast(MESSAGES.deleted)).toBeVisible();
      await expect(categories.sheet).toBeHidden();
      await expect(categories.row("kopi")).toHaveCount(0);
      await expect(categories.archivedSection).toBeHidden();
      expect(await categoryOf(db, user.id, "Kopi")).toBeUndefined();
    });
  });

  test.describe("@validation", () => {
    for (const { name, message } of [
      { name: "", message: MESSAGES.nameRequired },
      { name: "   ", message: MESSAGES.nameRequired },
      { name: "makan & minum", message: MESSAGES.nameTaken },
      { name: " MAKAN & MINUM ", message: MESSAGES.nameTaken },
      {
        name: "Nama kategori yang sangat panjang sekali",
        message: MESSAGES.nameTooLong,
      },
    ]) {
      test(`nama "${name}" → "${message}"`, async ({ db }) => {
        const before = await db.getCategories(user.id);
        await categories.goto();
        await categories.add(name, "coffee");

        await expect(categories.nameError).toHaveText(message);
        await expect(categories.sheet).toBeVisible();
        await expect(categories.nameInput).toHaveValue(name);
        expect(await db.getCategories(user.id)).toEqual(before);
      });
    }

    test("counter merah saat nama lebih dari 30 karakter", async () => {
      await categories.goto();
      await categories.openAdd();
      await categories.nameInput.fill("x".repeat(31));
      await expect(categories.nameCounter).toHaveText("31/30");
      await expect(categories.nameCounter).toHaveClass(/text-destructive/);
    });

    test("ikon wajib dipilih", async ({ db }) => {
      await categories.goto();
      await categories.add("Kopi");
      await expect(categories.iconError).toHaveText(MESSAGES.iconRequired);
      expect(await categoryOf(db, user.id, "Kopi")).toBeUndefined();

      await categories.iconOption("coffee").click();
      await expect(categories.iconError).toBeHidden();
      await categories.submitButton.click();
      await expect(categories.toast(MESSAGES.created)).toBeVisible();
    });

    test("nama sama boleh dipakai di jenis berbeda", async ({ db }) => {
      await categories.goto("income");
      await categories.add("Makan & Minum", "utensils");
      await expect(categories.toast(MESSAGES.created)).toBeVisible();
      await expect(categories.activeRow("makan-minum")).toBeVisible();
      expect(
        await categoryOf(db, user.id, "Makan & Minum", "INCOME"),
      ).toBeDefined();
    });

    test("nama yang sudah dipakai kategori terarsip tidak boleh dipakai lagi", async ({
      db,
    }) => {
      await db.createCategory(user.id, {
        name: "Game",
        icon: "gamepad",
        archived: true,
      });
      await categories.goto();
      await categories.add("game", "gamepad");
      await expect(categories.nameError).toHaveText(MESSAGES.nameTaken);
    });

    test("mengubah nama menjadi nama kategori lain ditolak", async () => {
      await categories.goto();
      await categories.openCategory("hiburan");
      await categories.nameInput.fill("belanja");
      await categories.submitButton.click();
      await expect(categories.nameError).toHaveText(MESSAGES.nameTaken);
      await expect(categories.sheet).toBeVisible();
    });

    test("tidak bisa mengarsipkan kategori aktif terakhir", async ({
      page,
      db,
    }) => {
      for (const name of ["Bonus", "Hadiah", "Lainnya"]) {
        await db.archiveCategory(user.id, name, "INCOME");
      }
      await categories.goto();
      await categories.selectTab("income");
      await expect(await categories.activeNames()).toEqual(["Gaji"]);
      await categories.openCategory("gaji");
      await categories.moreButton.click();
      await categories.archiveButton.click();

      await expect(categories.formAlert).toHaveText(MESSAGES.lastActive);
      await expect(categories.sheet).toBeVisible();
      expect(await categoryOf(db, user.id, "Gaji", "INCOME")).toMatchObject({
        archived: false,
      });

      // Menghapus kategori aktif terakhir juga ditolak.
      await categories.deleteButton.click();
      await categories.confirmDelete.click();
      await expect(page.getByTestId("delete-error-alert")).toHaveText(
        MESSAGES.lastActive,
      );
      await categories.confirmCancel.click();
      await categories.cancelButton.click();
      await expect(categories.activeRow("gaji")).toBeVisible();
    });
  });

  test.describe("@error-handling", () => {
    test("gagal menyimpan kategori: pesan error, data form tetap ada", async ({
      page,
      db,
    }) => {
      await categories.goto();
      await failServerActions(page);
      await categories.add("Kopi", "coffee");

      await expect(categories.formAlert).toHaveText(MESSAGES.systemError);
      await expect(categories.nameInput).toHaveValue("Kopi");
      await expect(categories.iconOption("coffee")).toHaveAttribute(
        "aria-checked",
        "true",
      );
      await expect(categories.submitButton).toBeEnabled();
      expect(await categoryOf(db, user.id, "Kopi")).toBeUndefined();
    });

    test("gagal mengaktifkan kembali: pesan error, kategori tetap terarsip", async ({
      page,
      db,
    }) => {
      await db.archiveCategory(user.id, "Hiburan");
      await categories.goto();
      await categories.expandArchived();
      await failServerActions(page);
      await categories.restoreButton("hiburan").click();

      await expect(
        page.locator("[data-sonner-toast]").filter({
          hasText: MESSAGES.systemError,
        }),
      ).toBeVisible();
      await expect(categories.archivedRow("hiburan")).toBeVisible();
      expect(await categoryOf(db, user.id, "Hiburan")).toMatchObject({
        archived: true,
      });
    });
  });

  test.describe("@security", () => {
    test("kategori tidak terlihat oleh pengguna lain", async ({
      page,
      db,
      createUser,
      loginAs,
    }) => {
      await categories.goto();
      await categories.add("Kopi", "coffee");
      await expect(categories.toast(MESSAGES.created)).toBeVisible();

      await categories.shell.logout();
      const ani = await createUser("ani", "Ani Wijaya");
      await loginAs(ani);
      await categories.goto();
      await expect(categories.activeRow("belanja")).toBeVisible();
      await expect(categories.row("kopi")).toHaveCount(0);

      const form = await openTransactionForm(page);
      await expect(form.category("belanja")).toBeVisible();
      await expect(form.category("kopi")).toHaveCount(0);
      expect(await categoryOf(db, ani.id, "Kopi")).toBeUndefined();
    });
  });
});
