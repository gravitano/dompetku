/**
 * E03-US02 Indikator pemakaian anggaran — docs/features/phase-01-mvp/
 * e-03---anggaran/e03-us02--indikator-pemakaian-anggaran---testing.md
 *
 * Skenario @smoke "Menampilkan pemakaian anggaran per kategori" ada di
 * `test/web/smoke/indikator-anggaran.spec.ts`. Nilai batas persentase/status
 * (79,99% / 80% / 99,99% / 100%, anggaran 0/sangat kecil) juga diuji di Vitest
 * (`src/modules/budgets/status.test.ts`).
 *
 * Determinisme tanggal: bulan berjalan ditentukan jam server (RSC + Server
 * Action), jadi `page.clock` tidak berlaku. "Oktober 2026" di testing.md =
 * bulan berjalan (`CURRENT`, dihitung dari jam mesin yang sama dengan server,
 * zona Asia/Jakarta), "September 2026" = `PREV`. Transaksi bulan berjalan
 * bertanggal tanggal 1 (tidak pernah di masa depan) — lulus di tanggal berapa
 * pun, termasuk tanggal 1, akhir bulan, dan Desember → Januari. Data uji: akun
 * baru per test (`createUser`) + anggaran/transaksi di-insert lewat fixture
 * `db` (kecuali skenario catat/ubah/hapus lewat UI).
 */
import type { Page } from "@playwright/test";

import { expect, test, type CreatedUser } from "../fixtures";
import type { SeedBudget, SeedTransaction, TestDb } from "../fixtures/db";
import { AppShell } from "../pages/app-shell";
import { BudgetsPage } from "../pages/budgets-page";
import { jakartaDate } from "../pages/home-page";
import { TransactionDetailPage } from "../pages/transaction-detail";
import { TransactionFormPage } from "../pages/transaction-form";
import { lastDayOfMonth, rupiah, shiftMonth } from "../pages/transactions-page";

const CURRENT = jakartaDate(0).slice(0, 7);
const PREV = shiftMonth(CURRENT, -1);
const NEXT = shiftMonth(CURRENT, 1);
/** Tanggal transaksi bulan berjalan yang selalu ≤ hari ini. */
const CURRENT_DAY = `${CURRENT}-01`;

type Status = "green" | "yellow" | "red";

/** Pengeluaran bulan berjalan. */
function expense(
  category: string,
  amount: number,
  extra: Partial<SeedTransaction> = {},
): SeedTransaction {
  return { date: CURRENT_DAY, type: "EXPENSE", category, amount, ...extra };
}

function budget(category: string, amount: number, month = CURRENT) {
  return { month, category, amount } satisfies SeedBudget;
}

async function seed(
  db: TestDb,
  user: CreatedUser,
  budgets: SeedBudget[],
  transactions: SeedTransaction[],
) {
  await db.insertBudgets(user.id, budgets);
  await db.insertTransactions(user.id, transactions);
}

test.describe("Indikator pemakaian anggaran", () => {
  let user: CreatedUser;
  let budgets: BudgetsPage;

  test.beforeEach(async ({ page, createUser, loginAs }) => {
    user = await createUser("budi");
    await loginAs(user);
    budgets = new BudgetsPage(page);
  });

  async function expectRow(
    slug: string,
    {
      text,
      percent,
      remaining,
      status,
    }: {
      text?: string;
      percent?: string;
      remaining?: string;
      status?: Status;
    },
  ) {
    const row = budgets.row(slug);
    if (text) await expect(row).toContainText(text);
    if (percent) await expect(budgets.percent(slug)).toHaveText(percent);
    if (remaining) await expect(budgets.remaining(slug)).toHaveText(remaining);
    if (status) await expect(row).toHaveAttribute("data-status", status);
  }

  /** Buka tab Anggaran lewat navigasi app (tanpa reload). */
  async function openBudgetsTab(page: Page, isMobile: boolean) {
    const shell = new AppShell(page);
    await (
      isMobile ? shell.bottomNav("budgets") : shell.sidebarNav("budgets")
    ).click();
    await expect(page).toHaveURL((url) => url.pathname === "/budgets");
    await budgets.waitForMonth(CURRENT);
  }

  test.describe("@happy-path", () => {
    for (const example of [
      {
        spent: 79_999,
        percent: "79%",
        status: "green",
        text: "Sisa Rp 20.001",
      },
      {
        spent: 80_000,
        percent: "80%",
        status: "yellow",
        text: "Sisa Rp 20.000",
      },
      { spent: 99_999, percent: "99%", status: "yellow", text: "Sisa Rp 1" },
      { spent: 100_000, percent: "100%", status: "red", text: "Sisa Rp 0" },
      {
        spent: 112_000,
        percent: "112%",
        status: "red",
        text: "Lebih Rp 12.000",
      },
    ] as const) {
      test(`warna status: terpakai ${rupiah(example.spent)} dari Rp 100.000 → ${example.percent} ${example.status}`, async ({
        db,
      }) => {
        // Dua transaksi agar terpakai = jumlah, bukan satu nominal saja.
        const first = Math.floor(example.spent / 2);
        await seed(
          db,
          user,
          [budget("Transportasi", 100_000)],
          [
            expense("Transportasi", first),
            expense("Transportasi", example.spent - first),
          ],
        );
        await budgets.goto(CURRENT);

        await expectRow("transportasi", {
          text: `${rupiah(example.spent)} / Rp 100.000`,
          percent: example.percent,
          status: example.status,
          remaining: example.text,
        });
        const progress = budgets.page.getByTestId(
          "budget-row-transportasi-progress",
        );
        await expect(progress).toHaveAttribute(
          "data-value",
          String(Math.min(Number.parseInt(example.percent), 100)),
        );
        // Status tidak hanya warna: ikon + teks status (terlihat untuk
        // Hampir habis/Terlampaui, hanya pembaca layar untuk Aman).
        const label = {
          green: "Aman",
          yellow: "Hampir habis",
          red: "Terlampaui",
        }[example.status];
        const status = budgets.page.getByTestId(
          "budget-row-transportasi-status",
        );
        await expect(status).toHaveAttribute("data-status-label", label);
        const statusLabel = budgets.page.getByTestId(
          "budget-row-transportasi-status-label",
        );
        await expect(statusLabel).toHaveText(label);
        if (example.status === "green") {
          await expect(statusLabel).toHaveClass(/sr-only/);
        } else {
          await expect(statusLabel).toBeVisible();
          await expect(statusLabel).not.toHaveClass(/sr-only/);
        }
        // Warna "Sisa/Lebih" mengikuti status (tepat 100% "Sisa Rp 0" merah).
        await expect(budgets.remaining("transportasi")).toHaveAttribute(
          "data-tone",
          { green: "muted", yellow: "yellow", red: "red" }[example.status],
        );
        // Kartu ringkasan memakai aturan warna yang sama.
        await expect(budgets.summaryRemaining).toHaveText(example.text);
        await expect(budgets.summaryRemaining).toHaveAttribute(
          "data-tone",
          { green: "muted", yellow: "yellow", red: "red" }[example.status],
        );
        if (example.status !== "green") {
          await expect(
            budgets.page.getByTestId("budget-summary-status-label"),
          ).toBeVisible();
        }
      });
    }

    test("ringkasan total, urutan persentase tertinggi, Tanpa anggaran & Belum diatur", async ({
      db,
    }) => {
      await seed(
        db,
        user,
        [
          budget("Makan & Minum", 1_500_000),
          budget("Transportasi", 600_000),
          budget("Belanja", 1_000_000),
          budget("Tagihan", 1_400_000),
        ],
        [
          expense("Makan & Minum", 1_000_000),
          expense("Makan & Minum", 680_000),
          expense("Transportasi", 510_000),
          expense("Belanja", 400_000),
          expense("Tagihan", 580_000),
          expense("Hiburan", 250_000),
          // Pemasukan & bulan lain tidak dihitung.
          { date: CURRENT_DAY, type: "INCOME", category: "Gaji", amount: 9e6 },
          expense("Belanja", 777_000, { date: lastDayOfMonth(PREV) }),
        ],
      );
      await budgets.goto(CURRENT);

      // Ringkasan: seluruh pengeluaran (termasuk Hiburan tanpa anggaran).
      await expect(budgets.summaryCard).toContainText(
        "Terpakai Rp 3.420.000 dari Rp 4.500.000",
      );
      await expect(budgets.summaryPercent).toHaveText("76%");
      await expect(budgets.summaryRemaining).toHaveText("Sisa Rp 1.080.000");
      await expect(budgets.summaryCard).toHaveAttribute("data-status", "green");
      await expect(budgets.total).toHaveText("Rp 4.500.000");

      // Urutan: persentase tertinggi dulu.
      expect(await budgets.budgetedNames()).toEqual([
        "Makan & Minum",
        "Transportasi",
        "Tagihan",
        "Belanja",
      ]);
      await expectRow("makan-minum", {
        text: "Rp 1.680.000 / Rp 1.500.000",
        percent: "112%",
        remaining: "Lebih Rp 180.000",
        status: "red",
      });
      await expectRow("transportasi", {
        percent: "85%",
        remaining: "Sisa Rp 90.000",
        status: "yellow",
      });
      await expectRow("tagihan", { percent: "41%", status: "green" });
      await expectRow("belanja", {
        text: "Rp 400.000 / Rp 1.000.000",
        percent: "40%",
        status: "green",
      });

      // Tanpa anggaran: hanya Hiburan; sisanya Belum diatur di paling bawah.
      await expect(
        budgets.unbudgetedSection.getByTestId("budget-row-name"),
      ).toHaveText(["Hiburan"]);
      await expect(budgets.notSetSection).toContainText("Belum diatur");
      await expect(
        budgets.notSetSection.getByTestId("budget-row-name"),
      ).toHaveText(["Kesehatan", "Lainnya"]);
      expect(await budgets.names()).toEqual([
        "Makan & Minum",
        "Transportasi",
        "Tagihan",
        "Belanja",
        "Hiburan",
        "Kesehatan",
        "Lainnya",
      ]);
    });

    test("kategori tanpa anggaran yang memiliki pengeluaran → Atur anggaran (UX-03)", async ({
      db,
    }) => {
      await seed(
        db,
        user,
        [budget("Belanja", 1_000_000)],
        [expense("Hiburan", 100_000), expense("Hiburan", 150_000)],
      );
      await budgets.goto(CURRENT);

      await expect(budgets.unbudgetedSection).toContainText("Tanpa anggaran");
      await expect(budgets.spent("hiburan")).toHaveText("Rp 250.000");
      await expect(
        budgets.unbudgetedSection.getByTestId("budget-row-hiburan"),
      ).toBeVisible();
      await expect(budgets.setUnbudgeted("hiburan")).toHaveText(
        "Atur anggaran",
      );
      // Ringkasan tetap menghitung pengeluaran tanpa anggaran.
      await expect(budgets.summaryCard).toContainText(
        "Terpakai Rp 250.000 dari Rp 1.000.000",
      );

      await budgets.setUnbudgeted("hiburan").click();
      await expect(budgets.sheet).toBeVisible();
      await expect(budgets.formTitle).toContainText("Hiburan");
      await budgets.amountInput.fill("200000");
      await budgets.submitButton.click();

      await expect(budgets.toast("Anggaran tersimpan")).toBeVisible();
      // Pindah ke daftar beranggaran dengan indikatornya (125% → paling atas).
      await expect(budgets.unbudgetedSection).toHaveCount(0);
      expect(await budgets.budgetedNames()).toEqual(["Hiburan", "Belanja"]);
      await expectRow("hiburan", {
        text: "Rp 250.000 / Rp 200.000",
        percent: "125%",
        remaining: "Lebih Rp 50.000",
        status: "red",
      });
      await expect(budgets.summaryCard).toContainText(
        "Terpakai Rp 250.000 dari Rp 1.200.000",
      );
    });

    test("indikator diperbarui setelah mencatat pengeluaran", async ({
      page,
      db,
      isMobile,
    }) => {
      await seed(
        db,
        user,
        [budget("Makan & Minum", 1_500_000)],
        [expense("Makan & Minum", 1_100_000)],
      );
      await budgets.goto(CURRENT);
      await expectRow("makan-minum", {
        text: "Rp 1.100.000 / Rp 1.500.000",
        percent: "73%",
        status: "green",
      });

      // Catat lewat FAB di Beranda, lalu kembali ke tab Anggaran.
      await page.goto("/");
      const form = new TransactionFormPage(page);
      await form.addExpense({ amount: "200000", category: "makan-minum" });
      await expect(form.toast("Pengeluaran tersimpan")).toBeVisible();
      await openBudgetsTab(page, isMobile);

      await expectRow("makan-minum", {
        text: "Rp 1.300.000 / Rp 1.500.000",
        percent: "86%",
        remaining: "Sisa Rp 200.000",
        status: "yellow",
      });
      await expect(budgets.summaryCard).toContainText(
        "Terpakai Rp 1.300.000 dari Rp 1.500.000",
      );
    });

    test("indikator diperbarui setelah menghapus transaksi", async ({
      page,
      db,
      isMobile,
    }) => {
      await seed(
        db,
        user,
        [budget("Makan & Minum", 1_500_000)],
        [
          expense("Makan & Minum", 1_380_000, { note: "Belanja bulanan" }),
          expense("Makan & Minum", 300_000, { note: "Traktir" }),
        ],
      );
      await budgets.goto(CURRENT);
      await expectRow("makan-minum", {
        percent: "112%",
        remaining: "Lebih Rp 180.000",
        status: "red",
      });

      const { id } = (await db.getTransactions(user.id)).find(
        (t) => t.note === "Traktir",
      )!;
      const detail = new TransactionDetailPage(page);
      await page.goto(`/transactions/${id}`);
      await detail.deleteAndConfirm();
      await expect(detail.form.toast("Transaksi dihapus")).toBeVisible();
      await openBudgetsTab(page, isMobile);

      await expectRow("makan-minum", {
        text: "Rp 1.380.000 / Rp 1.500.000",
        percent: "92%",
        remaining: "Sisa Rp 120.000",
        status: "yellow",
      });
    });

    test("indikator diperbarui setelah transaksi dipindah ke kategori lain", async ({
      page,
      db,
      isMobile,
    }) => {
      await seed(
        db,
        user,
        [budget("Makan & Minum", 1_000_000), budget("Belanja", 500_000)],
        [
          expense("Makan & Minum", 500_000, { note: "Makan" }),
          expense("Makan & Minum", 450_000, { note: "Pindahkan" }),
          expense("Belanja", 100_000, { note: "Sabun" }),
        ],
      );
      await budgets.goto(CURRENT);
      await expectRow("makan-minum", { percent: "95%", status: "yellow" });
      await expectRow("belanja", { percent: "20%", status: "green" });

      const { id } = (await db.getTransactions(user.id)).find(
        (t) => t.note === "Pindahkan",
      )!;
      const detail = new TransactionDetailPage(page);
      await page.goto(`/transactions/${id}`);
      await expect(detail.form.amountInput).toHaveValue("Rp 450.000");
      await detail.form.category("belanja").click();
      await detail.save();
      await expect(detail.form.toast("Perubahan tersimpan")).toBeVisible();
      await openBudgetsTab(page, isMobile);

      // Kedua kategori ikut berubah; urutan ikut persentase baru.
      expect(await budgets.budgetedNames()).toEqual([
        "Belanja",
        "Makan & Minum",
      ]);
      await expectRow("belanja", {
        text: "Rp 550.000 / Rp 500.000",
        percent: "110%",
        remaining: "Lebih Rp 50.000",
        status: "red",
      });
      await expectRow("makan-minum", {
        text: "Rp 500.000 / Rp 1.000.000",
        percent: "50%",
        remaining: "Sisa Rp 500.000",
        status: "green",
      });
      await expect(budgets.summaryCard).toContainText(
        "Terpakai Rp 1.050.000 dari Rp 1.500.000",
      );
    });

    test("ada anggaran tapi belum ada pengeluaran: 0%, hijau, Sisa sebesar anggaran", async ({
      db,
    }) => {
      await seed(
        db,
        user,
        [budget("Makan & Minum", 1_500_000), budget("Belanja", 1_000_000)],
        [],
      );
      await budgets.goto(CURRENT);

      for (const [slug, amount] of [
        ["makan-minum", "Rp 1.500.000"],
        ["belanja", "Rp 1.000.000"],
      ] as const) {
        await expectRow(slug, {
          text: `Rp 0 / ${amount}`,
          percent: "0%",
          remaining: `Sisa ${amount}`,
          status: "green",
        });
      }
      await expect(budgets.summaryPercent).toHaveText("0%");
      await expect(budgets.summaryRemaining).toHaveText("Sisa Rp 2.500.000");
      await expect(budgets.unbudgetedSection).toHaveCount(0);
    });

    test("belum ada anggaran: Total Rp 0, bagian Tanpa anggaran tetap muncul", async ({
      db,
    }) => {
      await db.insertTransactions(user.id, [expense("Hiburan", 250_000)]);
      await budgets.goto(CURRENT);

      await expect(budgets.emptyState).toContainText(
        "Belum ada anggaran untuk bulan ini",
      );
      await expect(budgets.total).toHaveText("Rp 0");
      await expect(budgets.summarySpent).toHaveText("Rp 250.000");
      await expect(budgets.summaryPercent).toHaveCount(0);
      await expect(budgets.spent("hiburan")).toHaveText("Rp 250.000");
      await expect(budgets.setUnbudgeted("hiburan")).toBeVisible();
      await expect(budgets.list).toHaveCount(0);
    });
  });

  test.describe("@validation", () => {
    test("transaksi bulan lain tidak dihitung", async ({ db }) => {
      await seed(
        db,
        user,
        [budget("Belanja", 1_000_000)],
        [
          expense("Belanja", 500_000, { date: lastDayOfMonth(PREV) }),
          expense("Belanja", 300_000, { date: `${NEXT}-01` }),
        ],
      );
      await budgets.goto(CURRENT);

      await expectRow("belanja", {
        text: "Rp 0 / Rp 1.000.000",
        percent: "0%",
        remaining: "Sisa Rp 1.000.000",
        status: "green",
      });
      await expect(budgets.summaryCard).toContainText(
        "Terpakai Rp 0 dari Rp 1.000.000",
      );
    });

    test("indikator bulan lampau tetap tampil (read-only)", async ({ db }) => {
      await seed(
        db,
        user,
        [budget("Makan & Minum", 1_200_000, PREV)],
        [
          expense("Makan & Minum", 1_000_000, { date: `${PREV}-01` }),
          expense("Makan & Minum", 260_000, { date: lastDayOfMonth(PREV) }),
          expense("Hiburan", 75_000, { date: `${PREV}-01` }),
        ],
      );
      await budgets.goto(CURRENT);
      await budgets.prev(PREV);

      await expect(budgets.readonlyLabel).toHaveText("Hanya lihat");
      await expectRow("makan-minum", {
        text: "Rp 1.260.000 / Rp 1.200.000",
        percent: "105%",
        remaining: "Lebih Rp 60.000",
        status: "red",
      });
      await expect(budgets.row("makan-minum")).toHaveAttribute(
        "data-readonly",
        "true",
      );
      await budgets.row("makan-minum").click();
      await expect(budgets.sheet).toBeHidden();
      await expect(budgets.summaryCard).toContainText(
        "Terpakai Rp 1.335.000 dari Rp 1.200.000",
      );
      await expect(budgets.summaryRemaining).toHaveText("Lebih Rp 135.000");
      await expect(budgets.summaryCard).toHaveAttribute("data-status", "red");
      // Tanpa anggaran tampil, tetapi tanpa tombol Atur anggaran.
      await expect(budgets.spent("hiburan")).toHaveText("Rp 75.000");
      await expect(budgets.setUnbudgeted("hiburan")).toHaveCount(0);
    });

    test("kategori terarsip: anggaran & pengeluarannya tetap terlihat read-only", async ({
      db,
    }) => {
      await db.createCategory(user.id, { name: "Game", icon: "gamepad" });
      await db.createCategory(user.id, { name: "Hobi", icon: "package" });
      await seed(
        db,
        user,
        [budget("Game", 100_000)],
        [expense("Game", 90_000), expense("Hobi", 40_000)],
      );
      await db.archiveCategory(user.id, "Game");
      await db.archiveCategory(user.id, "Hobi");
      await budgets.goto(CURRENT);

      await expectRow("game", { percent: "90%", status: "yellow" });
      await expect(budgets.archivedLabel("game")).toHaveText("Diarsipkan");
      await expect(budgets.row("game")).toHaveAttribute(
        "data-readonly",
        "true",
      );
      await expect(budgets.spent("hobi")).toHaveText("Rp 40.000");
      await expect(budgets.archivedLabel("hobi")).toHaveText("Diarsipkan");
      await expect(budgets.setUnbudgeted("hobi")).toHaveCount(0);
      await expect(budgets.summaryCard).toContainText(
        "Terpakai Rp 130.000 dari Rp 100.000",
      );
    });
  });

  test.describe("@error-handling", () => {
    test("gagal memuat data anggaran → pesan + Coba lagi", async ({
      page,
      db,
      baseURL,
    }) => {
      await seed(
        db,
        user,
        [budget("Belanja", 1_000_000)],
        [expense("Belanja", 400_000)],
      );
      // Simulasi server gagal (hanya aktif di server E2E, lihat
      // apps/web/src/lib/fault-injection.ts).
      await page
        .context()
        .addCookies([
          { name: "e2e-fault", value: "budgets-load", url: baseURL! },
        ]);
      await page.goto("/budgets");

      await expect(budgets.loadError).toContainText(
        "Gagal memuat anggaran. Coba lagi.",
      );
      await expect(budgets.retryButton).toHaveText("Coba lagi");
      await expect(budgets.root).toHaveCount(0);

      // Server pulih → Coba lagi memuat data.
      await page.context().clearCookies({ name: "e2e-fault" });
      await budgets.retryButton.click();
      await budgets.waitForMonth(CURRENT);
      await expect(budgets.loadError).toHaveCount(0);
      await expectRow("belanja", { percent: "40%", status: "green" });
    });
  });

  test.describe("@security", () => {
    test("pemakaian anggaran tidak menghitung transaksi pengguna lain", async ({
      db,
      createUser,
    }) => {
      const ani = await createUser("ani", "Ani Wijaya");
      await seed(db, ani, [], [expense("Belanja", 900_000)]);
      await db.insertBudgets(user.id, [budget("Belanja", 1_000_000)]);
      await budgets.goto(CURRENT);

      await expectRow("belanja", {
        text: "Rp 0 / Rp 1.000.000",
        percent: "0%",
        remaining: "Sisa Rp 1.000.000",
        status: "green",
      });
      await expect(budgets.summaryCard).toContainText(
        "Terpakai Rp 0 dari Rp 1.000.000",
      );
      await expect(budgets.unbudgetedSection).toHaveCount(0);
    });
  });
});
