/**
 * E03-US03 Peringatan anggaran — docs/features/phase-01-mvp/e-03---anggaran/
 * e03-us03--peringatan-anggaran---testing.md
 *
 * Skenario @smoke "Peringatan hampir habis saat melewati 80%" ada di
 * `test/web/smoke/peringatan-anggaran.spec.ts`. Tabel naik level (aman →
 * hampir, aman → terlampaui, tetap, turun, bulan lain, pindah kategori, tanpa
 * anggaran) juga diuji di Vitest (`src/modules/budgets/alerts.test.ts`,
 * `src/modules/transactions/actions.test.ts`).
 *
 * Determinisme tanggal: bulan berjalan ditentukan jam server (Server Action +
 * RSC), jadi `page.clock` tidak berlaku. "Oktober 2026" di testing.md = bulan
 * berjalan (`CURRENT`, zona Asia/Jakarta), "September 2026" = `PREV`.
 * Pengeluaran awal bertanggal 1 bulan berjalan; pengeluaran baru memakai
 * tanggal bawaan form (hari ini) — lulus di tanggal berapa pun. Data uji: akun
 * baru per test (`createUser`) + anggaran/transaksi lewat fixture `db`.
 */
import { expect, test, type CreatedUser } from "../fixtures";
import type { SeedTransaction, TestDb } from "../fixtures/db";
import { BudgetAlerts } from "../pages/budget-alerts";
import { BudgetsPage } from "../pages/budgets-page";
import { jakartaDate } from "../pages/home-page";
import { TransactionDetailPage } from "../pages/transaction-detail";
import { TransactionFormPage } from "../pages/transaction-form";
import { lastDayOfMonth, shiftMonth } from "../pages/transactions-page";

const CURRENT = jakartaDate(0).slice(0, 7);
const PREV = shiftMonth(CURRENT, -1);
/** Tanggal transaksi bulan berjalan yang selalu ≤ hari ini. */
const CURRENT_DAY = `${CURRENT}-01`;
const MAKAN = "Makan & Minum";

function expense(
  category: string,
  amount: number,
  extra: Partial<SeedTransaction> = {},
): SeedTransaction {
  return { date: CURRENT_DAY, type: "EXPENSE", category, amount, ...extra };
}

test.describe("Peringatan anggaran", () => {
  let user: CreatedUser;
  let form: TransactionFormPage;
  let alerts: BudgetAlerts;

  test.beforeEach(async ({ page, db, createUser, loginAs }) => {
    user = await createUser("budi");
    // Background: anggaran Makan & Minum Rp 1.500.000 bulan berjalan.
    await db.insertBudgets(user.id, [
      { month: CURRENT, category: MAKAN, amount: 1_500_000 },
    ]);
    await loginAs(user);
    form = new TransactionFormPage(page);
    alerts = new BudgetAlerts(page);
  });

  /** Pengeluaran Makan & Minum bulan berjalan sebelum skenario. */
  async function spentBefore(db: TestDb, amount: number) {
    if (amount > 0)
      await db.insertTransactions(user.id, [expense(MAKAN, amount)]);
  }

  /** Catat pengeluaran lewat FAB di Beranda (tanggal bawaan = hari ini). */
  async function recordExpense(amount: number, category = "makan-minum") {
    await form.page.goto("/");
    await form.addExpense({ amount: String(amount), category });
    await expect(form.toast("Pengeluaran tersimpan")).toBeVisible();
  }

  /** Toast peringatan muncul tepat satu, SETELAH toast sukses `savedText`. */
  async function expectAlert(
    level: "warning" | "over",
    message: string,
    savedText = "Pengeluaran tersimpan",
  ) {
    await expect(alerts.toast).toHaveCount(1);
    await expect(alerts.toast).toBeVisible();
    await expect(alerts.toast).toHaveAttribute("data-level", level);
    await expect(alerts.toast).toHaveAttribute(
      "role",
      level === "over" ? "alert" : "status",
    );
    await expect(alerts.toastMessage).toHaveText(message);
    // Sonner: toast terbaru ber-`data-index` 0 → peringatan dibuat setelah
    // toast sukses.
    await expect(alerts.sonnerItem(message)).toHaveAttribute("data-index", "0");
    await expect(alerts.sonnerItem(savedText)).toHaveAttribute(
      "data-index",
      "1",
    );
  }

  test.describe("@happy-path", () => {
    test("peringatan terlampaui saat melewati 100%", async ({ db }) => {
      await spentBefore(db, 1_300_000);
      await recordExpense(380_000);
      await expectAlert(
        "over",
        "Anggaran Makan & Minum terlampaui. Lebih Rp 180.000.",
      );
    });

    test("lompat langsung dari aman ke terlampaui hanya menampilkan satu peringatan", async ({
      db,
    }) => {
      await spentBefore(db, 500_000);
      await recordExpense(1_100_000);
      await expectAlert(
        "over",
        "Anggaran Makan & Minum terlampaui. Lebih Rp 100.000.",
      );
      await expect(alerts.sonnerItem("sudah terpakai")).toHaveCount(0);
    });

    test("tautan Lihat anggaran membuka halaman Anggaran bulan berjalan", async ({
      page,
      db,
    }) => {
      await spentBefore(db, 1_100_000);
      await recordExpense(175_000);
      await expectAlert(
        "warning",
        "Anggaran Makan & Minum sudah terpakai 85%. Sisa Rp 225.000.",
      );
      await alerts.toastLink.click();
      await expect(page).toHaveURL((url) => url.pathname === "/budgets");
      const budgets = new BudgetsPage(page);
      await budgets.waitForMonth(CURRENT);
      await expect(alerts.toast).toHaveCount(0);
      await expect(alerts.pageBanner).toContainText(
        "Hampir habis: Makan & Minum",
      );
    });

    test("tombol ✕ menutup toast peringatan", async ({ db }) => {
      await spentBefore(db, 1_100_000);
      await recordExpense(175_000);
      await expect(alerts.toast).toBeVisible();
      await alerts.toastClose.click();
      await expect(alerts.toast).toHaveCount(0);
    });

    test("peringatan saat mengubah pengeluaran", async ({ page, db }) => {
      await db.insertTransactions(user.id, [
        expense(MAKAN, 1_050_000, { note: "Belanja bulanan" }),
        expense(MAKAN, 50_000, { note: "Makan siang" }),
      ]);
      const { id } = (await db.getTransactions(user.id)).find(
        (t) => t.note === "Makan siang",
      )!;
      const detail = new TransactionDetailPage(page);
      await page.goto(`/transactions/${id}`);
      await expect(detail.form.amountInput).toHaveValue("Rp 50.000");
      await detail.form.amountInput.fill("250000");
      await detail.save();
      await expect(form.toast("Perubahan tersimpan")).toBeVisible();
      await expectAlert(
        "warning",
        "Anggaran Makan & Minum sudah terpakai 86%. Sisa Rp 200.000.",
        "Perubahan tersimpan",
      );
    });

    test("banner di Beranda dan halaman Anggaran", async ({ page, db }) => {
      await db.insertBudgets(user.id, [
        { month: CURRENT, category: "Transportasi", amount: 600_000 },
      ]);
      await db.insertTransactions(user.id, [
        expense(MAKAN, 1_600_000),
        expense("Transportasi", 500_000),
      ]);
      await page.goto("/");
      await expect(alerts.homeBanner).toBeVisible();
      await expect(alerts.homeBanner).toHaveText(
        "2 kategori perlu perhatian: 1 terlampaui, 1 hampir habis",
      );
      await expect(alerts.homeBanner).toHaveAttribute("data-level", "over");
      // Banner di atas kartu ringkasan (slot E04-US01).
      const bannerBox = (await alerts.homeBanner.boundingBox())!;
      const summaryBox = (await page
        .getByTestId("month-summary")
        .boundingBox())!;
      expect(bannerBox.y).toBeLessThan(summaryBox.y);

      await alerts.homeBanner.click();
      await expect(page).toHaveURL((url) => url.pathname === "/budgets");
      const budgets = new BudgetsPage(page);
      await budgets.waitForMonth(CURRENT);
      await expect(alerts.pageBanner).toContainText(
        "Terlampaui: Makan & Minum",
      );
      await expect(alerts.pageBanner).toContainText(
        "Hampir habis: Transportasi",
      );
      await expect(alerts.pageBanner).toHaveAttribute("data-level", "over");
      const pageBannerBox = (await alerts.pageBanner.boundingBox())!;
      const cardBox = (await budgets.summaryCard.boundingBox())!;
      expect(pageBannerBox.y).toBeLessThan(cardBox.y);
    });

    test("banner hilang setelah anggaran dinaikkan", async ({ page, db }) => {
      await spentBefore(db, 1_275_000);
      await page.goto("/");
      await expect(alerts.homeBanner).toBeVisible();
      await expect(alerts.homeBanner).toHaveText(
        "1 kategori perlu perhatian: 1 hampir habis",
      );
      await expect(alerts.homeBanner).toHaveAttribute("data-level", "warning");

      const budgets = new BudgetsPage(page);
      await budgets.goto();
      await budgets.waitForMonth(CURRENT);
      await expect(alerts.pageBanner).toHaveText(/Hampir habis: Makan & Minum/);
      await budgets.row("makan-minum").click();
      await budgets.amountInput.fill("2000000");
      await budgets.submitButton.click();
      await expect(budgets.sheet).toBeHidden();
      await expect(alerts.pageBanner).toHaveCount(0);

      await page.goto("/");
      await expect(page.getByTestId("summary-expense-total")).toBeVisible();
      await expect(alerts.homeBanner).toHaveCount(0);
    });

    test("banner hilang setelah transaksi dihapus", async ({ page, db }) => {
      await db.insertTransactions(user.id, [
        expense(MAKAN, 1_000_000),
        expense(MAKAN, 300_000, { note: "Hapus saya" }),
      ]);
      await page.goto("/");
      await expect(alerts.homeBanner).toBeVisible();
      const { id } = (await db.getTransactions(user.id)).find(
        (t) => t.note === "Hapus saya",
      )!;
      const detail = new TransactionDetailPage(page);
      await page.goto(`/transactions/${id}`);
      await detail.deleteAndConfirm();
      await expect(form.toast("Transaksi dihapus")).toBeVisible();
      // Hapus tidak memicu peringatan.
      await expect(alerts.toast).toHaveCount(0);
      await page.goto("/");
      await expect(page.getByTestId("summary-expense-total")).toBeVisible();
      await expect(alerts.homeBanner).toHaveCount(0);
    });
  });

  test.describe("@validation", () => {
    for (const example of [
      { before: 500_000, amount: 100_000, label: "tetap Aman" },
      { before: 1_250_000, amount: 50_000, label: "tetap Hampir habis" },
      {
        before: 1_600_000,
        amount: 50_000,
        label: "sudah Terlampaui sebelumnya",
      },
    ]) {
      test(`tidak ada peringatan jika status tidak naik level (${example.label})`, async ({
        db,
      }) => {
        await spentBefore(db, example.before);
        await recordExpense(example.amount);
        await expect(alerts.toast).toHaveCount(0);
      });
    }

    test("tidak ada peringatan untuk pengeluaran bulan lalu", async ({
      db,
    }) => {
      await spentBefore(db, 1_100_000);
      await form.page.goto("/");
      await form.addExpense({
        amount: "500000",
        category: "makan-minum",
        date: lastDayOfMonth(PREV),
      });
      await expect(form.toast("Pengeluaran tersimpan")).toBeVisible();
      await expect(alerts.toast).toHaveCount(0);
    });

    test("tidak ada peringatan untuk kategori tanpa anggaran", async () => {
      await recordExpense(2_000_000, "hiburan");
      await expect(alerts.toast).toHaveCount(0);
    });

    test("banner tidak tampil di halaman Anggaran bulan lampau", async ({
      page,
      db,
    }) => {
      await db.insertBudgets(user.id, [
        { month: PREV, category: MAKAN, amount: 1_200_000 },
      ]);
      await db.insertTransactions(user.id, [
        expense(MAKAN, 1_500_000, { date: lastDayOfMonth(PREV) }),
      ]);
      const budgets = new BudgetsPage(page);
      await budgets.goto();
      await budgets.waitForMonth(CURRENT);
      await budgets.prev(PREV);
      await expect(budgets.row("makan-minum")).toHaveAttribute(
        "data-status",
        "red",
      );
      await expect(alerts.pageBanner).toHaveCount(0);
      // Bulan lalu tidak memengaruhi banner Beranda bulan berjalan.
      await page.goto("/");
      await expect(page.getByTestId("summary-expense-total")).toBeVisible();
      await expect(alerts.homeBanner).toHaveCount(0);
    });
  });

  test.describe("@security", () => {
    test("peringatan tidak dipengaruhi data pengguna lain", async ({
      page,
      db,
      createUser,
    }) => {
      const ani = await createUser("ani", "Ani Lestari");
      await db.insertBudgets(ani.id, [
        { month: CURRENT, category: MAKAN, amount: 1_500_000 },
      ]);
      await db.insertTransactions(ani.id, [expense(MAKAN, 5_000_000)]);

      await recordExpense(100_000);
      await expect(alerts.toast).toHaveCount(0);
      await page.goto("/");
      await expect(page.getByTestId("summary-expense-total")).toBeVisible();
      await expect(alerts.homeBanner).toHaveCount(0);
    });
  });
});
