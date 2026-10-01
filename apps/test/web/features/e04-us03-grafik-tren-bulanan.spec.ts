/**
 * E04-US03 Grafik tren bulanan — docs/features/phase-01-mvp/
 * e-04---laporan-grafik/e04-us03--grafik-tren-bulanan---testing.md
 *
 * Skenario @smoke "Menampilkan tren 6 bulan terakhir termasuk bulan berjalan"
 * juga ada di `test/web/smoke/laporan-tren.spec.ts`.
 *
 * Determinisme tanggal: bulan berjalan ditentukan jam server (RSC), jadi
 * `page.clock` tidak berlaku. "Oktober 2026" di testing.md = bulan berjalan
 * (`M[0]`), "September 2026" = bulan lalu (`M[-1]`), dst. sampai "April 2026"
 * (`M[-6]`, di luar jendela). Bulan lalu memakai tanggal tetap 2–20 (selalu
 * ada); transaksi bulan berjalan bertanggal 1 (tidak pernah di masa depan).
 * Data uji: akun baru per test (`createUser`) + transaksi lewat fixture `db`.
 */
import { expect, test, type CreatedUser } from "../fixtures";
import type { SeedTransaction } from "../fixtures/db";
import { AppShell } from "../pages/app-shell";
import { jakartaDate } from "../pages/home-page";
import {
  ReportsPage,
  ReportsTrend,
  shortMonthLabel,
} from "../pages/reports-page";
import { monthLabel, shiftMonth } from "../pages/transactions-page";

const CURRENT = jakartaDate(0).slice(0, 7);
/** Bulan relatif terhadap bulan berjalan: `month(-1)` = bulan lalu. */
const month = (offset: number) => shiftMonth(CURRENT, offset);
/** 6 bulan jendela tren, terlama → bulan berjalan ("Mei" … "Okt"). */
const WINDOW = [-5, -4, -3, -2, -1, 0].map(month);

/** Background testing.md: total per bulan April (−6) … Oktober (0). */
const BACKGROUND: { offset: number; income: number; expense: number }[] = [
  { offset: -6, income: 8_000_000, expense: 5_000_000 },
  { offset: -5, income: 8_000_000, expense: 1_000_000 },
  { offset: -4, income: 8_000_000, expense: 2_000_000 },
  { offset: -3, income: 0, expense: 0 },
  { offset: -2, income: 8_000_000, expense: 1_500_000 },
  { offset: -1, income: 8_000_000, expense: 3_000_000 },
  { offset: 0, income: 8_000_000, expense: 1_500_000 },
];

function backgroundTransactions(): SeedTransaction[] {
  return BACKGROUND.flatMap(({ offset, income, expense }) => {
    const key = month(offset);
    // Bulan berjalan: tanggal 1 saja (tidak pernah di masa depan).
    const [incomeDay, expenseDays] =
      offset === 0 ? ["01", ["01", "01"]] : ["02", ["05", "20"]];
    const rows: SeedTransaction[] = [];
    if (income > 0) {
      rows.push({
        date: `${key}-${incomeDay}`,
        type: "INCOME",
        category: "Gaji",
        amount: income,
      });
    }
    if (expense > 0) {
      // Dua transaksi per bulan — total per bulan yang diuji, bukan per baris.
      rows.push(
        {
          date: `${key}-${expenseDays[0]}`,
          type: "EXPENSE",
          category: "Makan & Minum",
          amount: expense - 500_000,
        },
        {
          date: `${key}-${expenseDays[1]}`,
          type: "EXPENSE",
          category: "Transportasi",
          amount: 500_000,
        },
      );
    }
    return rows;
  });
}

test.describe("Grafik tren bulanan", () => {
  let budi: CreatedUser;
  let reports: ReportsPage;
  let trend: ReportsTrend;

  test.beforeEach(async ({ page, db, createUser, loginAs }) => {
    budi = await createUser("budi");
    await db.insertTransactions(budi.id, backgroundTransactions());
    await loginAs(budi);
    reports = new ReportsPage(page);
    trend = new ReportsTrend(page);
  });

  test.describe("@happy-path", () => {
    test("menampilkan tren 6 bulan terakhir termasuk bulan berjalan", async () => {
      await reports.goto();

      await expect(trend.title).toHaveText("Tren 6 bulan");
      await expect(trend.bars).toHaveCount(6);
      expect(await trend.barMonths()).toEqual(WINDOW);
      await expect(trend.xAxisLabels).toHaveText(WINDOW.map(shortMonthLabel));
      // Bulan ke-7 ("April 2026") tidak ditampilkan.
      await expect(trend.bar(month(-6))).toHaveCount(0);
      await expect(trend.legend).toHaveText(/Pemasukan.*Pengeluaran/);
      await expect(trend.legend.getByRole("listitem")).toHaveText([
        "Pemasukan",
        "Pengeluaran",
      ]);
      await expect(trend.chart.getByRole("img")).toHaveAttribute(
        "aria-label",
        new RegExp(
          `${monthLabel(month(-1))} pemasukan Rp 8\\.000\\.000, pengeluaran Rp 3\\.000\\.000`,
        ),
      );
      // Sumbu Y memakai nominal singkat.
      await expect(
        trend.chart.locator(
          ".recharts-yAxis-tick-labels .recharts-cartesian-axis-tick-value",
        ),
      ).toContainText(["Rp 0"]);
      await expect(trend.insufficientData).toHaveCount(0);
      // Seksi tren berada di bawah grafik kategori.
      const category = await reports.root
        .getByTestId("expense-category-report")
        .boundingBox();
      const section = await trend.root.boundingBox();
      expect(section!.y).toBeGreaterThan(category!.y);
    });

    test("tooltip menampilkan nominal lengkap", async ({ isMobile }) => {
      await reports.goto();
      await trend.focusMonth(month(-1), isMobile);

      await expect(trend.tooltip).toBeVisible();
      await expect(trend.tooltipMonth).toHaveText(monthLabel(month(-1)));
      await expect(trend.tooltipIncome).toHaveText("Rp 8.000.000");
      await expect(trend.tooltipExpense).toHaveText("Rp 3.000.000");
      await expect(trend.bar(month(-1))).toHaveAttribute("data-active", "true");

      if (isMobile) {
        // Tap di luar grafik menutup tooltip (UX-03).
        await trend.title.tap();
        await expect(trend.tooltip).toHaveCount(0);
      } else {
        // Mouse keluar → tooltip hilang.
        await trend.page.mouse.move(0, 0);
        await expect(trend.tooltip).toHaveCount(0);
      }
      await expect(trend.bar(month(-1))).toHaveAttribute(
        "data-active",
        "false",
      );
    });

    test("bulan tanpa transaksi tetap tampil dengan nilai nol", async ({
      isMobile,
    }) => {
      await reports.goto();
      await expect(trend.bar(month(-3))).toHaveAttribute("data-income", "0");
      await trend.focusMonth(month(-3), isMobile);

      await expect(trend.tooltipMonth).toHaveText(monthLabel(month(-3)));
      await expect(trend.tooltipIncome).toHaveText("Rp 0");
      await expect(trend.tooltipExpense).toHaveText("Rp 0");
    });

    test("menampilkan rata-rata pengeluaran 6 bulan", async () => {
      await reports.goto();
      await expect(trend.average).toHaveText(
        "Rata-rata pengeluaran per bulan: Rp 1.500.000",
      );
      await expect(trend.average).toHaveAttribute("data-value", "1500000");
      await expect(trend.averageNote).toHaveText(
        "Total pengeluaran 6 bulan ÷ 6, termasuk bulan berjalan & bulan tanpa transaksi.",
      );
    });

    test("tabel angka per bulan tersedia (aksesibilitas)", async () => {
      await reports.goto();
      await trend.tableToggle.click();
      await expect(trend.tableRows).toHaveCount(6);
      await expect(
        trend.tableRows.and(trend.root.locator(`[data-month="${month(-1)}"]`)),
      ).toHaveText(
        new RegExp(
          `${monthLabel(month(-1))}\\s*Rp 8\\.000\\.000\\s*Rp 3\\.000\\.000`,
        ),
      );
    });

    test("grafik tren tidak berubah saat bulan di selector diganti", async () => {
      await reports.goto();
      await expect(reports.total).toHaveText("Rp 1.500.000");
      await reports.monthPrev.click();

      await expect(reports.monthLabel).toHaveText(monthLabel(month(-1)));
      await expect(reports.total).toHaveText("Rp 3.000.000");
      await expect(trend.bars).toHaveCount(6);
      expect(await trend.barMonths()).toEqual(WINDOW);
      await expect(trend.xAxisLabels).toHaveText(WINDOW.map(shortMonthLabel));
      await expect(trend.average).toHaveText(
        "Rata-rata pengeluaran per bulan: Rp 1.500.000",
      );
    });
  });

  test.describe("@empty-state", () => {
    test("pengguna dengan data kurang dari 2 bulan", async ({
      page,
      db,
      createUser,
      loginAs,
      isMobile,
    }) => {
      const baru = await createUser("baru", "Pengguna Baru");
      await db.insertTransactions(baru.id, [
        {
          date: `${CURRENT}-01`,
          type: "EXPENSE",
          category: "Makan & Minum",
          amount: 600_000,
        },
      ]);
      await page.context().clearCookies();
      await loginAs(baru);
      await reports.goto();

      await expect(trend.insufficientData).toHaveText(
        "Tren akan lebih terlihat setelah ada data minimal 2 bulan",
      );
      await expect(trend.chart).toBeVisible();
      await expect(trend.bars).toHaveCount(6);
      expect(await trend.barMonths()).toEqual(WINDOW);
      await expect(trend.average).toHaveText(
        "Rata-rata pengeluaran per bulan: Rp 100.000",
      );
      await trend.focusMonth(CURRENT, isMobile);
      await expect(trend.tooltipExpense).toHaveText("Rp 600.000");
    });

    test("pesan data kurang tidak muncul untuk akun dengan data ≥ 2 bulan", async () => {
      await reports.goto();
      await expect(trend.average).toBeVisible();
      await expect(trend.insufficientData).toHaveCount(0);
    });
  });

  test.describe("@error-handling", () => {
    test("gagal memuat tren tidak mengganggu grafik kategori", async ({
      page,
      baseURL,
    }) => {
      await page
        .context()
        .addCookies([
          { name: "e2e-fault", value: "reports-trend-load", url: baseURL! },
        ]);
      await reports.goto();

      await expect(trend.loadError).toContainText(
        "Gagal memuat tren. Coba lagi.",
      );
      await expect(trend.retryButton).toHaveText("Coba lagi");
      await expect(trend.chart).toHaveCount(0);
      // Grafik pengeluaran per kategori tetap tampil.
      await expect(reports.total).toHaveText("Rp 1.500.000");
      await expect(reports.chart).toBeVisible();
      await expect(reports.loadError).toHaveCount(0);

      // "Coba lagi" memuat ulang seksi tren saja.
      await page.context().clearCookies({ name: "e2e-fault" });
      await reports.total.evaluate((node) =>
        node.setAttribute("data-e2e-marker", "kept"),
      );
      await trend.retryButton.click();
      await expect(trend.average).toHaveText(
        "Rata-rata pengeluaran per bulan: Rp 1.500.000",
      );
      await expect(trend.loadError).toHaveCount(0);
      await expect(trend.bars).toHaveCount(6);
      await expect(reports.total).toHaveAttribute("data-e2e-marker", "kept");
    });

    test("Coba lagi yang masih gagal tetap menampilkan pesan", async ({
      page,
      baseURL,
    }) => {
      await page
        .context()
        .addCookies([
          { name: "e2e-fault", value: "reports-trend-load", url: baseURL! },
        ]);
      await reports.goto();
      await expect(trend.retryButton).toBeVisible();
      await trend.retryButton.click();
      await expect(trend.loadError).toContainText(
        "Gagal memuat tren. Coba lagi.",
      );
      await expect(reports.total).toHaveText("Rp 1.500.000");
    });
  });

  test.describe("@security", () => {
    test("tren tidak menghitung data pengguna lain", async ({
      page,
      createUser,
      loginAs,
      isMobile,
    }) => {
      const ani = await createUser("ani", "Ani Wijaya");
      await reports.goto();
      await expect(trend.average).toHaveText(
        "Rata-rata pengeluaran per bulan: Rp 1.500.000",
      );

      await new AppShell(page).logout();
      await loginAs(ani);
      await reports.goto();

      await expect(trend.average).toHaveText(
        "Rata-rata pengeluaran per bulan: Rp 0",
      );
      await trend.focusMonth(month(-1), isMobile);
      await expect(trend.tooltipMonth).toHaveText(monthLabel(month(-1)));
      await expect(trend.tooltipExpense).toHaveText("Rp 0");
      await expect(trend.tooltipIncome).toHaveText("Rp 0");
    });
  });
});
