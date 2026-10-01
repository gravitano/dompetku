/**
 * E04-US02 Grafik pengeluaran per kategori — docs/features/phase-01-mvp/
 * e-04---laporan-grafik/e04-us02--grafik-pengeluaran-kategori---testing.md
 *
 * Skenario @smoke "Laporan menampilkan bulan berjalan secara default" ada di
 * `test/web/smoke/laporan-kategori.spec.ts`.
 *
 * Determinisme tanggal: bulan berjalan ditentukan jam server (RSC), jadi
 * `page.clock` tidak berlaku. "Oktober 2026" di testing.md = bulan berjalan
 * (`CURRENT`), "September 2026" = bulan lalu (`PREV`, tanggal tetap 2–20 yang
 * selalu ada), "Agustus 2026" = dua bulan lalu (`EMPTY`). Transaksi bulan
 * berjalan bertanggal 1 (tidak pernah di masa depan). Data uji: akun baru per
 * test (`createUser`) + transaksi di-insert lewat fixture `db`.
 */
import { expect, test, type CreatedUser } from "../fixtures";
import type { SeedTransaction, TestDb } from "../fixtures/db";
import { AppShell } from "../pages/app-shell";
import { jakartaDate } from "../pages/home-page";
import { ReportsPage } from "../pages/reports-page";
import {
  monthLabel,
  shiftMonth,
  TransactionsPage,
} from "../pages/transactions-page";

const CURRENT = jakartaDate(0).slice(0, 7);
const PREV = shiftMonth(CURRENT, -1);
const EMPTY = shiftMonth(CURRENT, -2);

/** Background testing.md (pengeluaran & pemasukan "September 2026" + Oktober). */
function backgroundTransactions(): SeedTransaction[] {
  return [
    {
      date: `${PREV}-02`,
      type: "EXPENSE",
      category: "Makan & Minum",
      amount: 600_000,
      note: "Belanja dapur",
    },
    {
      date: `${PREV}-20`,
      type: "EXPENSE",
      category: "Makan & Minum",
      amount: 400_000,
      note: "Makan keluarga",
    },
    {
      date: `${PREV}-05`,
      type: "EXPENSE",
      category: "Transportasi",
      amount: 500_000,
      note: "Bensin",
    },
    {
      date: `${PREV}-10`,
      type: "EXPENSE",
      category: "Tagihan",
      amount: 300_000,
      note: "Listrik",
    },
    {
      date: `${PREV}-15`,
      type: "EXPENSE",
      category: "Hiburan",
      amount: 200_000,
      note: "Nonton",
    },
    {
      date: `${PREV}-01`,
      type: "INCOME",
      category: "Gaji",
      amount: 8_000_000,
      note: "Gaji",
    },
    {
      date: `${CURRENT}-01`,
      type: "EXPENSE",
      category: "Makan & Minum",
      amount: 25_000,
      note: "Makan siang",
    },
  ];
}

async function seedBudi(db: TestDb, user: CreatedUser) {
  await db.insertTransactions(user.id, backgroundTransactions());
  await db.archiveCategory(user.id, "Hiburan");
}

const SEPTEMBER_ROWS = [
  { name: "Makan & Minum", percent: "50,0%", amount: "Rp 1.000.000" },
  { name: "Transportasi", percent: "25,0%", amount: "Rp 500.000" },
  { name: "Tagihan", percent: "15,0%", amount: "Rp 300.000" },
  { name: "Hiburan", percent: "10,0%", amount: "Rp 200.000" },
];

test.describe("Grafik pengeluaran per kategori", () => {
  let budi: CreatedUser;
  let reports: ReportsPage;

  test.beforeEach(async ({ page, db, createUser, loginAs }) => {
    budi = await createUser("budi");
    await seedBudi(db, budi);
    await loginAs(budi);
    reports = new ReportsPage(page);
  });

  test.describe("@happy-path", () => {
    test("tab Laporan aktif dan menampilkan bulan berjalan", async ({
      page,
      isMobile,
    }) => {
      await reports.goto();
      const shell = new AppShell(page);
      const nav = isMobile
        ? shell.bottomNav("reports")
        : shell.sidebarNav("reports");
      await expect(nav).toHaveAttribute("aria-current", "page");
      await expect(reports.title).toHaveText("Laporan");
      await expect(reports.monthLabel).toHaveText(monthLabel(CURRENT));
      await expect(reports.total).toHaveText("Rp 25.000");
      await expect(reports.monthNext).toBeDisabled();
      await expect(reports.monthPrev).toBeEnabled();
      await expect(await reports.rows()).toEqual([
        { name: "Makan & Minum", percent: "100,0%", amount: "Rp 25.000" },
      ]);
    });

    test("melihat pengeluaran per kategori bulan sebelumnya", async ({
      page,
    }) => {
      await reports.goto();
      await expect(reports.total).toHaveText("Rp 25.000");
      await reports.monthPrev.click();

      await expect(reports.monthLabel).toHaveText(monthLabel(PREV));
      await expect(page).toHaveURL(
        (url) =>
          url.pathname === "/reports" && url.searchParams.get("month") === PREV,
      );
      await expect(reports.total).toHaveText("Rp 2.000.000");
      await expect(reports.monthNext).toBeEnabled();
      await expect(reports.items).toHaveCount(4);
      expect(await reports.rows()).toEqual(SEPTEMBER_ROWS);
      // Pemasukan "Gaji" tidak dihitung di grafik.
      await expect(reports.item("gaji")).toHaveCount(0);
      await expect(reports.total).toHaveAttribute("data-value", "2000000");
      await expect(reports.chart).toBeVisible();
      await expect(reports.chartCenter).toHaveText("Rp 2 jt");
      await expect(reports.chart.getByRole("img")).toHaveAttribute(
        "aria-label",
        /Makan & Minum 50,0%, Transportasi 25,0%, Tagihan 15,0%, Hiburan 10,0%/,
      );

      // ▶ kembali ke bulan berjalan.
      await reports.monthNext.click();
      await expect(reports.monthLabel).toHaveText(monthLabel(CURRENT));
      await expect(reports.total).toHaveText("Rp 25.000");
      await expect(reports.monthNext).toBeDisabled();
    });

    test("kategori terarsip tetap tampil di bulan yang memiliki transaksinya", async () => {
      await reports.goto(PREV);
      const hiburan = reports.item("hiburan");
      await expect(hiburan.getByTestId("category-breakdown-name")).toHaveText(
        "Hiburan",
      );
      await expect(
        hiburan.getByTestId("category-breakdown-archived"),
      ).toHaveText("(diarsipkan)");
      await expect(
        reports.item("makan-minum").getByTestId("category-breakdown-archived"),
      ).toHaveCount(0);
      await expect(reports.segment("hiburan")).toHaveCount(1);
    });

    test("tap kategori membuka daftar transaksi terfilter", async ({
      page,
      isMobile,
    }) => {
      await reports.goto(PREV);
      await reports.item("makan-minum").click();

      await expect(page).toHaveURL(
        (url) =>
          url.pathname === "/transactions" &&
          url.searchParams.get("month") === PREV &&
          url.searchParams.getAll("category").length === 1,
      );
      const list = new TransactionsPage(page);
      const shell = new AppShell(page);
      const nav = isMobile
        ? shell.bottomNav("transactions")
        : shell.sidebarNav("transactions");
      await expect(nav).toHaveAttribute("aria-current", "page");
      await expect(list.monthLabel).toHaveText(monthLabel(PREV));
      await expect(list.chip("makan-minum")).toHaveText("Makan & Minum");
      await expect(list.chip("type")).toHaveCount(0);
      await expect(list.rows).toHaveCount(2);
      await expect(list.summaryExpense).toHaveText("Rp 1.000.000");
    });

    test("tap kategori terarsip membuka daftar terfilter kategori tsb", async ({
      page,
    }) => {
      await reports.goto(PREV);
      await reports.item("hiburan").click();
      const list = new TransactionsPage(page);
      await expect(list.monthLabel).toHaveText(monthLabel(PREV));
      await expect(list.chip("hiburan")).toBeVisible();
      await expect(list.rows).toHaveCount(1);
      await expect(list.summaryExpense).toHaveText("Rp 200.000");
    });

    test("tooltip segmen menampilkan nominal lengkap, lalu membuka daftar terfilter", async ({
      page,
      isMobile,
    }) => {
      await reports.goto(PREV);
      const segment = reports.segment("transportasi");
      // HP: tap pertama = highlight + tooltip; desktop: hover.
      await reports.focusSegment("transportasi", isMobile);

      await expect(reports.tooltip).toBeVisible();
      await expect(
        reports.tooltip.getByTestId("chart-tooltip-name"),
      ).toHaveText("Transportasi");
      await expect(
        reports.tooltip.getByTestId("chart-tooltip-amount"),
      ).toHaveText("Rp 500.000");
      await expect(
        reports.tooltip.getByTestId("chart-tooltip-percent"),
      ).toHaveText("25,0%");
      await expect(segment).toHaveAttribute("data-active", "true");
      await expect(page).toHaveURL((url) => url.pathname === "/reports");

      // HP: tap kedua; desktop: klik → daftar transaksi terfilter.
      await reports.openSegment("transportasi", isMobile);
      await expect(page).toHaveURL(
        (url) =>
          url.pathname === "/transactions" &&
          url.searchParams.get("month") === PREV,
      );
      const list = new TransactionsPage(page);
      await expect(list.chip("transportasi")).toBeVisible();
      await expect(list.rows).toHaveCount(1);
      await expect(list.summaryExpense).toHaveText("Rp 500.000");
    });
  });

  test.describe("@validation", () => {
    test("persentase dibulatkan dan totalnya sekitar 100%", async ({
      page,
      db,
      createUser,
      loginAs,
    }) => {
      const ani = await createUser("ani", "Ani Wijaya");
      await db.insertTransactions(
        ani.id,
        ["Makan & Minum", "Transportasi", "Belanja"].map((category) => ({
          date: `${CURRENT}-01`,
          type: "EXPENSE" as const,
          category,
          amount: 100_000,
        })),
      );
      await page.context().clearCookies();
      await loginAs(ani);
      await reports.goto();

      await expect(reports.total).toHaveText("Rp 300.000");
      await expect(reports.items).toHaveCount(3);
      const rows = await reports.rows();
      expect(rows.map((row) => row.percent)).toEqual([
        "33,3%",
        "33,3%",
        "33,3%",
      ]);
      expect(rows.every((row) => row.amount === "Rp 100.000")).toBe(true);
    });

    test("lebih dari 8 kategori: donut menggabungkan sisanya ke 'Lainnya', daftar tetap lengkap", async ({
      page,
      db,
      createUser,
      loginAs,
      isMobile,
    }) => {
      const citra = await createUser("citra", "Citra");
      for (const name of ["Pendidikan", "Hewan"]) {
        await db.createCategory(citra.id, { name });
      }
      const names = [
        "Makan & Minum",
        "Transportasi",
        "Belanja",
        "Tagihan",
        "Hiburan",
        "Kesehatan",
        "Lainnya",
        "Pendidikan",
        "Hewan",
      ];
      await db.insertTransactions(
        citra.id,
        names.map((category, index) => ({
          date: `${PREV}-0${(index % 9) + 1}`,
          type: "EXPENSE" as const,
          category,
          amount: (9 - index) * 10_000,
        })),
      );
      await page.context().clearCookies();
      await loginAs(citra);
      await reports.goto(PREV);

      await expect(reports.total).toHaveText("Rp 450.000");
      await expect(reports.items).toHaveCount(9);
      expect((await reports.rows()).map((row) => row.name)).toEqual(names);
      await expect(
        reports.chart.locator('[data-testid^="chart-segment-"]'),
      ).toHaveCount(8);
      // Kategori "Lainnya" milik user tetap punya kunci sendiri.
      await expect(reports.item("lainnya-2")).toHaveCount(1);
      await reports.focusSegment("lainnya", isMobile);
      await expect(
        reports.tooltip.getByTestId("chart-tooltip-name"),
      ).toHaveText("Lainnya (2 kategori)");
      await expect(
        reports.tooltip.getByTestId("chart-tooltip-amount"),
      ).toHaveText("Rp 30.000");
    });
  });

  test.describe("@empty-state", () => {
    test("bulan tanpa pengeluaran", async () => {
      await reports.goto(PREV);
      await expect(reports.total).toHaveText("Rp 2.000.000");
      await reports.monthPrev.click();

      await expect(reports.monthLabel).toHaveText(monthLabel(EMPTY));
      await expect(reports.total).toHaveText("Rp 0");
      await expect(reports.empty).toHaveText(
        "Belum ada pengeluaran di bulan ini",
      );
      await expect(reports.chart).toHaveCount(0);
      await expect(reports.items).toHaveCount(0);
    });
  });

  test.describe("@error-handling", () => {
    test("gagal memuat laporan lalu Coba lagi", async ({ page, baseURL }) => {
      await page
        .context()
        .addCookies([
          { name: "e2e-fault", value: "reports-load", url: baseURL! },
        ]);
      await reports.goto();

      await expect(reports.loadError).toContainText(
        "Gagal memuat laporan. Periksa koneksi lalu coba lagi.",
      );
      await expect(reports.retryButton).toHaveText("Coba lagi");
      await expect(reports.total).toHaveCount(0);
      // Selector bulan tetap bisa dipakai.
      await expect(reports.monthLabel).toHaveText(monthLabel(CURRENT));

      await page.context().clearCookies({ name: "e2e-fault" });
      await reports.retryButton.click();
      await expect(reports.total).toHaveText("Rp 25.000");
      await expect(reports.loadError).toHaveCount(0);
    });
  });

  test.describe("@security", () => {
    test("laporan tidak menghitung data pengguna lain", async ({
      page,
      createUser,
      loginAs,
    }) => {
      const ani = await createUser("ani", "Ani Wijaya");
      await reports.goto(PREV);
      await expect(reports.total).toHaveText("Rp 2.000.000");

      await new AppShell(page).logout();
      await loginAs(ani);
      await reports.goto(PREV);

      await expect(reports.monthLabel).toHaveText(monthLabel(PREV));
      await expect(reports.total).toHaveText("Rp 0");
      await expect(reports.empty).toHaveText(
        "Belum ada pengeluaran di bulan ini",
      );
      await expect(reports.items).toHaveCount(0);
    });
  });
});
