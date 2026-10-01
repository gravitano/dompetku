/**
 * E03-US01 Atur anggaran kategori — docs/features/phase-01-mvp/
 * e-03---anggaran/e03-us01--atur-anggaran-kategori---testing.md
 *
 * Skenario @smoke "Mengatur anggaran untuk kategori yang belum diatur" ada di
 * `test/web/smoke/atur-anggaran.spec.ts`. Skenario "request langsung" (atur /
 * hapus anggaran kategori user lain, bulan lampau, kategori terarsip lewat
 * Server Action) diuji di Vitest (`src/modules/budgets/actions.test.ts`).
 *
 * Determinisme tanggal: bulan berjalan ditentukan jam server (RSC + Server
 * Action), jadi `page.clock` tidak berlaku. Testing.md memakai "hari ini 15
 * Oktober 2026"; di sini "Oktober 2026" = bulan berjalan (`CURRENT`, dihitung
 * dari jam mesin yang sama dengan server, zona Asia/Jakarta), "November 2026" =
 * `NEXT`, "September 2026" = `PREV` — lulus di tanggal berapa pun. Data uji:
 * akun baru per test (`createUser`) + anggaran di-insert lewat fixture `db`.
 */
import { expect, test, type CreatedUser } from "../fixtures";
import {
  abortServerActions,
  delayServerActions,
} from "../fixtures/server-actions";
import { BudgetsPage } from "../pages/budgets-page";
import { jakartaDate } from "../pages/home-page";
import { monthLabel, rupiah, shiftMonth } from "../pages/transactions-page";

const CURRENT = jakartaDate(0).slice(0, 7);
const NEXT = shiftMonth(CURRENT, 1);
const PREV = shiftMonth(CURRENT, -1);

const MESSAGES = {
  saved: "Anggaran tersimpan",
  deleted: "Anggaran dihapus",
  copied: (month: string) => `Anggaran disalin dari ${monthLabel(month)}`,
  notSet: "Belum diatur",
  readOnly: "Hanya lihat",
  empty: "Belum ada anggaran untuk bulan ini",
  systemError: "Gagal menyimpan. Periksa koneksi lalu coba lagi.",
} as const;

const EXPENSE_CATEGORIES = [
  "Makan & Minum",
  "Transportasi",
  "Belanja",
  "Tagihan",
  "Hiburan",
  "Kesehatan",
  "Lainnya",
];

test.describe("Atur anggaran kategori", () => {
  let user: CreatedUser;
  let budgets: BudgetsPage;

  test.beforeEach(async ({ page, createUser, loginAs }) => {
    user = await createUser("budi");
    await loginAs(user);
    budgets = new BudgetsPage(page);
  });

  async function expectTotal(value: number) {
    await expect(budgets.total).toHaveText(rupiah(value));
    await expect(budgets.total).toHaveAttribute("data-value", String(value));
  }

  test.describe("@happy-path", () => {
    test("tab Anggaran: bulan berjalan, semua kategori pengeluaran aktif Belum diatur (AC 1–3)", async ({
      page,
      isMobile,
    }) => {
      await page.goto("/");
      await (
        isMobile
          ? budgets.shell.bottomNav("budgets")
          : budgets.shell.sidebarNav("budgets")
      ).click();
      await expect(page).toHaveURL((url) => url.pathname === "/budgets");
      await budgets.waitForMonth(CURRENT);

      await expect(budgets.title).toHaveText("Anggaran");
      await expect(budgets.monthLabel).toHaveText(monthLabel(CURRENT));
      await expect(budgets.readonlyLabel).toBeHidden();
      await expect(budgets.monthNext).toBeEnabled();
      await expect(await budgets.names()).toEqual(EXPENSE_CATEGORIES);
      for (const slug of ["makan-minum", "hiburan", "lainnya"]) {
        await expect(budgets.amount(slug)).toHaveText(MESSAGES.notSet);
        await expect(budgets.row(slug)).toHaveAttribute(
          "data-budget-set",
          "false",
        );
      }
      await expectTotal(0);

      // Empty state tanpa anggaran bulan lalu: hanya ajakan atur manual.
      await expect(budgets.emptyState).toContainText(MESSAGES.empty);
      await expect(budgets.emptyState).toContainText(
        "Tap kategori untuk mengatur anggaran",
      );
      await expect(budgets.copyButton).toHaveCount(0);
    });

    test("mengubah anggaran yang sudah ada (AC 5, 7)", async ({ db }) => {
      await db.insertBudgets(user.id, [
        { month: CURRENT, category: "Transportasi", amount: 600_000 },
      ]);
      await budgets.goto(CURRENT);
      await expect(budgets.amount("transportasi")).toHaveText("Rp 600.000");
      await expectTotal(600_000);
      await expect(budgets.emptyState).toBeHidden();

      await budgets.open("transportasi");
      await expect(budgets.formTitle).toHaveText(
        `Anggaran Transportasi — ${monthLabel(CURRENT)}`,
      );
      await expect(budgets.amountInput).toHaveValue("Rp 600.000");
      await expect(budgets.amountInput).toBeFocused();
      await expect(budgets.deleteButton).toBeVisible();

      await budgets.amountInput.fill("750000");
      await expect(budgets.amountInput).toHaveValue("Rp 750.000");
      await budgets.submitButton.click();

      await expect(budgets.toast(MESSAGES.saved)).toBeVisible();
      await expect(budgets.sheet).toBeHidden();
      await expect(budgets.amount("transportasi")).toHaveText("Rp 750.000");
      await expectTotal(750_000);
      // Atur ulang mengubah anggaran yang ada, bukan menambah baru.
      expect(await db.getBudgets(user.id)).toEqual([
        { month: CURRENT, category: "Transportasi", amount: 750_000 },
      ]);
    });

    test("menghapus anggaran setelah konfirmasi (AC 6, 8)", async ({ db }) => {
      await db.insertBudgets(user.id, [
        { month: CURRENT, category: "Belanja", amount: 1_000_000 },
        { month: CURRENT, category: "Tagihan", amount: 1_400_000 },
      ]);
      await budgets.goto(CURRENT);
      await expectTotal(2_400_000);

      await budgets.open("belanja");
      await budgets.deleteButton.click();
      await expect(budgets.deleteDialog).toBeVisible();
      await expect(budgets.deleteTitle).toHaveText(
        `Hapus anggaran Belanja untuk ${monthLabel(CURRENT)}?`,
      );

      // Batal → kembali ke form, anggaran tetap.
      await budgets.confirmCancel.click();
      await expect(budgets.deleteDialog).toBeHidden();
      await expect(budgets.sheet).toBeVisible();

      await budgets.deleteButton.click();
      await budgets.confirmDelete.click();
      await expect(budgets.toast(MESSAGES.deleted)).toBeVisible();
      await expect(budgets.sheet).toBeHidden();
      await expect(budgets.amount("belanja")).toHaveText(MESSAGES.notSet);
      await expectTotal(1_400_000);
      expect(await db.getBudgets(user.id)).toEqual([
        { month: CURRENT, category: "Tagihan", amount: 1_400_000 },
      ]);
    });

    test("menyalin anggaran dari bulan lalu (AC 9)", async ({ db }) => {
      await db.createCategory(user.id, { name: "Hobi", icon: "gamepad" });
      await db.insertBudgets(user.id, [
        { month: CURRENT, category: "Makan & Minum", amount: 1_500_000 },
        { month: CURRENT, category: "Tagihan", amount: 1_400_000 },
        { month: CURRENT, category: "Hobi", amount: 300_000 },
      ]);
      // Hobi diarsipkan setelah punya anggaran → tidak ikut disalin.
      await db.archiveCategory(user.id, "Hobi");
      await budgets.goto();
      await expectTotal(3_200_000);

      await budgets.next(NEXT);
      await expect(budgets.monthLabel).toHaveText(monthLabel(NEXT));
      await expect(budgets.emptyState).toContainText(MESSAGES.empty);
      await expectTotal(0);
      await expect(budgets.copyButton).toContainText("Salin dari bulan lalu");
      await budgets.copyButton.click();

      await expect(budgets.toast(MESSAGES.copied(CURRENT))).toBeVisible();
      await expect(budgets.amount("makan-minum")).toHaveText("Rp 1.500.000");
      await expect(budgets.amount("tagihan")).toHaveText("Rp 1.400.000");
      await expectTotal(2_900_000);
      await expect(budgets.copyButton).toHaveCount(0);
      await expect(budgets.emptyState).toBeHidden();
      await expect(budgets.row("hobi")).toHaveCount(0);
      expect(
        (await db.getBudgets(user.id)).filter((b) => b.month === NEXT),
      ).toEqual([
        { month: NEXT, category: "Makan & Minum", amount: 1_500_000 },
        { month: NEXT, category: "Tagihan", amount: 1_400_000 },
      ]);
    });
  });

  test.describe("@validation", () => {
    test("tombol salin tidak tampil jika bulan sudah punya anggaran", async ({
      db,
    }) => {
      await db.insertBudgets(user.id, [
        { month: PREV, category: "Makan & Minum", amount: 1_200_000 },
        { month: CURRENT, category: "Tagihan", amount: 1_400_000 },
      ]);
      await budgets.goto(CURRENT);
      await expect(budgets.amount("tagihan")).toHaveText("Rp 1.400.000");
      await expect(budgets.copyButton).toHaveCount(0);
      await expect(budgets.emptyState).toHaveCount(0);
    });

    for (const { nominal, message } of [
      { nominal: "", message: "Nominal wajib diisi" },
      { nominal: "0", message: "Nominal harus lebih dari 0" },
      { nominal: "1000000001", message: "Nominal maksimal Rp 1.000.000.000" },
    ]) {
      test(`nominal ${JSON.stringify(nominal)} ditolak: ${message}`, async ({
        db,
      }) => {
        await budgets.goto(CURRENT);
        await budgets.open("hiburan");
        await expect(budgets.amountInput).toBeFocused();
        await expect(budgets.amountInput).toHaveAttribute(
          "inputmode",
          "numeric",
        );
        await expect(budgets.deleteButton).toHaveCount(0);
        if (nominal) await budgets.amountInput.fill(nominal);
        await budgets.submitButton.click();

        await expect(budgets.amountError).toHaveText(message);
        await expect(budgets.amountInput).toHaveAttribute(
          "aria-invalid",
          "true",
        );
        await expect(budgets.sheet).toBeVisible();
        await expect(budgets.toast(MESSAGES.saved)).toHaveCount(0);
        expect(await db.getBudgets(user.id)).toEqual([]);

        // Diperbaiki → pesan hilang dan tersimpan.
        await budgets.amountInput.fill("250000");
        await expect(budgets.amountError).toBeHidden();
        await budgets.submitButton.click();
        await expect(budgets.toast(MESSAGES.saved)).toBeVisible();
        await expect(budgets.amount("hiburan")).toHaveText("Rp 250.000");
      });
    }

    test("bulan lampau hanya bisa dilihat (AC 10)", async ({ page, db }) => {
      await db.insertBudgets(user.id, [
        { month: PREV, category: "Makan & Minum", amount: 1_200_000 },
        { month: shiftMonth(CURRENT, -2), category: "Belanja", amount: 1 },
      ]);
      await budgets.goto(CURRENT);
      await budgets.prev(PREV);

      await expect(page).toHaveURL(
        (url) => url.searchParams.get("month") === PREV,
      );
      await expect(budgets.monthLabel).toHaveText(monthLabel(PREV));
      await expect(budgets.readonlyLabel).toHaveText(MESSAGES.readOnly);
      await expect(budgets.amount("makan-minum")).toHaveText("Rp 1.200.000");
      await expectTotal(1_200_000);
      for (const slug of ["makan-minum", "belanja"]) {
        await expect(budgets.row(slug)).toHaveAttribute(
          "data-readonly",
          "true",
        );
        await expect(
          budgets.row(slug).locator("xpath=self::button"),
        ).toHaveCount(0);
      }
      await budgets.row("makan-minum").click();
      await budgets.row("belanja").click();
      await expect(budgets.sheet).toBeHidden();

      // Bulan lampau kosong: tanpa tombol salin walau bulan sebelumnya ada.
      await budgets.prev(shiftMonth(CURRENT, -2));
      await budgets.prev(shiftMonth(CURRENT, -3));
      await expect(budgets.emptyState).toContainText(MESSAGES.empty);
      await expect(budgets.copyButton).toHaveCount(0);
      await expect(budgets.emptyState).not.toContainText("Tap kategori");
      await expect(budgets.readonlyLabel).toBeVisible();
    });

    test("tidak bisa berpindah lebih dari 1 bulan ke depan (AC 2)", async ({
      page,
    }) => {
      await budgets.goto();
      await budgets.next(NEXT);
      await expect(budgets.monthLabel).toHaveText(monthLabel(NEXT));
      await expect(budgets.monthNext).toBeDisabled();
      await expect(budgets.readonlyLabel).toBeHidden();
      await expect(budgets.row("makan-minum")).toHaveAttribute(
        "data-readonly",
        "false",
      );

      // URL bulan > +1 dibatasi ke bulan depan; bulan tidak valid → berjalan.
      await budgets.page.goto(`/budgets?month=${shiftMonth(CURRENT, 5)}`);
      await budgets.waitForMonth(NEXT);
      await expect(budgets.monthLabel).toHaveText(monthLabel(NEXT));
      await page.goto("/budgets?month=bukan-bulan");
      await budgets.waitForMonth(CURRENT);
      await expect(budgets.monthLabel).toHaveText(monthLabel(CURRENT));
    });

    test("hanya kategori pengeluaran aktif yang ditampilkan; anggaran kategori terarsip read-only", async ({
      db,
    }) => {
      await db.createCategory(user.id, {
        name: "Hobi",
        icon: "gamepad",
        archived: true,
      });
      await db.createCategory(user.id, { name: "Game", icon: "gamepad" });
      await db.insertBudgets(user.id, [
        { month: CURRENT, category: "Game", amount: 200_000 },
        { month: CURRENT, category: "Makan & Minum", amount: 1_000_000 },
      ]);
      await db.archiveCategory(user.id, "Game");
      await budgets.goto(CURRENT);

      const names = await budgets.names();
      expect(names).not.toContain("Gaji");
      expect(names).not.toContain("Hobi");
      await expect(budgets.row("gaji")).toHaveCount(0);
      await expect(budgets.row("hobi")).toHaveCount(0);

      // Keputusan PO: anggaran yang sudah ada tetap tampil (Diarsipkan) — sejak
      // E03-US02 di daftar beranggaran; seri persentase → kategori aktif dulu.
      expect(await budgets.budgetedNames()).toEqual(["Makan & Minum", "Game"]);
      await expect(budgets.archivedLabel("game")).toHaveText("Diarsipkan");
      await expect(budgets.amount("game")).toHaveText("Rp 200.000");
      await expect(budgets.row("game")).toHaveAttribute(
        "data-readonly",
        "true",
      );
      await budgets.row("game").click();
      await expect(budgets.sheet).toBeHidden();
      await expectTotal(1_200_000);

      // Bulan depan: kategori terarsip tanpa anggaran tidak tampil.
      await budgets.next(NEXT);
      await expect(budgets.row("game")).toHaveCount(0);
    });
  });

  test.describe("@error-handling", () => {
    test("gagal menyimpan karena koneksi terputus: pesan error, nominal tetap", async ({
      page,
      db,
    }) => {
      await budgets.goto(CURRENT);
      await abortServerActions(page);
      await budgets.open("kesehatan");
      await budgets.amountInput.fill("300000");
      await budgets.submitButton.click();

      await expect(budgets.formAlert).toHaveText(MESSAGES.systemError);
      await expect(budgets.amountInput).toHaveValue("Rp 300.000");
      await expect(budgets.submitButton).toBeEnabled();
      await expect(budgets.sheet).toBeVisible();
      expect(await db.getBudgets(user.id)).toEqual([]);
    });
  });

  test.describe("@security", () => {
    test("anggaran tidak terlihat oleh pengguna lain (AC 12)", async ({
      page,
      db,
      createUser,
      loginAs,
    }) => {
      await db.insertBudgets(user.id, [
        { month: CURRENT, category: "Makan & Minum", amount: 1_500_000 },
      ]);
      await budgets.goto(CURRENT);
      await expect(budgets.amount("makan-minum")).toHaveText("Rp 1.500.000");

      const ani = await createUser("ani", "Ani Wijaya");
      await budgets.shell.logout();
      await loginAs(ani);
      await budgets.goto(CURRENT);
      await expect(budgets.amount("makan-minum")).toHaveText(MESSAGES.notSet);
      await expectTotal(0);
      await page.goto(`/budgets?month=${NEXT}`);
      await budgets.waitForMonth(NEXT);
      await expect(budgets.copyButton).toHaveCount(0);
    });
  });

  test.describe("@loading", () => {
    test("simpan: tombol loading & nonaktif, klik ganda tidak membuat duplikat", async ({
      page,
      db,
    }) => {
      await budgets.goto(CURRENT);
      await delayServerActions(page, 800);
      await budgets.open("makan-minum");
      await budgets.amountInput.fill("1500000");
      await budgets.submitButton.click();
      await expect(budgets.submitButton).toBeDisabled();
      await expect(budgets.submitButton).toHaveText(/Menyimpan/);
      await budgets.submitButton.click({ force: true });

      await expect(budgets.toast(MESSAGES.saved)).toBeVisible();
      await expect(budgets.amount("makan-minum")).toHaveText("Rp 1.500.000");
      expect(await db.getBudgets(user.id)).toEqual([
        { month: CURRENT, category: "Makan & Minum", amount: 1_500_000 },
      ]);
    });
  });
});
