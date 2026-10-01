/**
 * E04-US01 Dashboard ringkasan bulanan (Beranda) — docs/features/phase-01-mvp/
 * e-04---laporan-grafik/e04-us01--dashboard-ringkasan-bulanan---testing.md
 *
 * Skenario @smoke "Beranda menampilkan ringkasan bulan berjalan setelah login"
 * ada di `test/web/smoke/dashboard.spec.ts`.
 *
 * Determinisme tanggal: bulan berjalan ditentukan jam server (RSC), jadi
 * `page.clock` tidak berlaku. "Oktober 2026" di testing.md = bulan berjalan
 * (`CURRENT`, zona Asia/Jakarta), "September 2026" = `PREV`. Tanggal fixture
 * (1, 5, 10, 12, 14) dibatasi maksimal hari ini (`day()`), sehingga tidak
 * pernah di masa depan dan lulus di tanggal berapa pun — termasuk tanggal 1,
 * akhir bulan, dan Desember → Januari. Urutan "terbaru" tetap sama karena
 * waktu dicatat (`created_at`) mengikuti urutan fixture. Data uji: akun baru
 * per test (`createUser`) + transaksi/anggaran di-insert lewat fixture `db`.
 */
import { expect, test, type CreatedUser } from "../fixtures";
import type { SeedTransaction, TestDb } from "../fixtures/db";
import { AppShell } from "../pages/app-shell";
import { HomePage, jakartaDate } from "../pages/home-page";
import { TransactionFormPage } from "../pages/transaction-form";
import { monthLabel, shiftMonth } from "../pages/transactions-page";

const TODAY = jakartaDate(0);
const CURRENT = TODAY.slice(0, 7);
const PREV = shiftMonth(CURRENT, -1);

/** Tanggal `n` bulan berjalan, maksimal hari ini (tidak pernah di masa depan). */
function day(n: number): string {
  const clamped = Math.min(n, Number(TODAY.slice(8, 10)));
  return `${CURRENT}-${String(clamped).padStart(2, "0")}`;
}

/** Background testing.md: transaksi "Oktober 2026" + satu "September 2026". */
function backgroundTransactions(): SeedTransaction[] {
  return [
    {
      date: `${PREV}-15`,
      type: "EXPENSE",
      category: "Belanja",
      amount: 500_000,
      note: "Belanja bulan lalu",
    },
    {
      date: day(1),
      type: "INCOME",
      category: "Gaji",
      amount: 8_000_000,
      note: "Gaji Oktober",
    },
    {
      date: day(5),
      type: "EXPENSE",
      category: "Tagihan",
      amount: 350_000,
      note: "Listrik",
    },
    {
      date: day(10),
      type: "EXPENSE",
      category: "Belanja",
      amount: 450_000,
      note: "Belanja bulanan",
    },
    {
      date: day(12),
      type: "EXPENSE",
      category: "Transportasi",
      amount: 18_000,
      note: "Ojek",
    },
    {
      date: day(12),
      type: "EXPENSE",
      category: "Makan & Minum",
      amount: 25_000,
      note: "Makan siang",
    },
    {
      date: day(14),
      type: "EXPENSE",
      category: "Hiburan",
      amount: 100_000,
      note: "Nonton",
    },
  ];
}

async function seedBudi(db: TestDb, user: CreatedUser) {
  await db.insertTransactions(user.id, backgroundTransactions());
}

test.describe("Dashboard ringkasan bulanan", () => {
  let budi: CreatedUser;
  let home: HomePage;

  test.beforeEach(async ({ page, db, createUser }) => {
    budi = await createUser("budi");
    await seedBudi(db, budi);
    home = new HomePage(page);
  });

  test.describe("@happy-path", () => {
    test("Beranda aktif di navigasi dengan judul periode dan ringkasan", async ({
      page,
      loginAs,
      isMobile,
    }) => {
      await loginAs(budi);
      await home.goto();

      const shell = new AppShell(page);
      const nav = isMobile ? shell.bottomNav("home") : shell.sidebarNav("home");
      await expect(nav).toHaveAttribute("aria-current", "page");
      await expect(home.title).toHaveText("Beranda");
      await expect(home.period).toHaveText(monthLabel(CURRENT));
      await expect(home.incomeTotal).toHaveText("Rp 8.000.000");
      await expect(home.expenseTotal).toHaveText("Rp 943.000");
      await expect(home.balance).toHaveText("+ Rp 7.057.000");
      await expect(home.balance).toHaveAttribute("data-state", "positive");
      await expect(home.balance).toHaveAttribute("data-value", "7057000");
      // Transaksi September tidak ikut dihitung.
      await expect(home.expenseTotal).toHaveAttribute("data-value", "943000");
    });

    test("selisih negatif ditampilkan merah dengan tanda −", async ({
      db,
      createUser,
      loginAs,
    }) => {
      const ani = await createUser("ani", "Ani Wijaya");
      await db.insertTransactions(ani.id, [
        { date: day(1), type: "INCOME", category: "Gaji", amount: 1_000_000 },
        {
          date: day(1),
          type: "EXPENSE",
          category: "Belanja",
          amount: 1_500_000,
        },
      ]);
      await loginAs(ani);
      await home.goto();

      await expect(home.balance).toHaveText("− Rp 500.000");
      await expect(home.balance).toHaveAttribute("data-state", "negative");
      await expect(home.balance.locator(".text-expense")).toHaveCount(1);
    });

    test("selisih nol ditampilkan netral", async ({
      db,
      createUser,
      loginAs,
    }) => {
      const ani = await createUser("ani", "Ani Wijaya");
      await db.insertTransactions(ani.id, [
        { date: day(1), type: "INCOME", category: "Gaji", amount: 200_000 },
        { date: day(1), type: "EXPENSE", category: "Belanja", amount: 200_000 },
      ]);
      await loginAs(ani);
      await home.goto();

      await expect(home.balance).toHaveText("Rp 0");
      await expect(home.balance).toHaveAttribute("data-state", "zero");
      await expect(home.balance.locator(".text-income")).toHaveCount(0);
      await expect(home.balance.locator(".text-expense")).toHaveCount(0);
    });

    test("menampilkan 5 transaksi terbaru", async ({ loginAs }) => {
      await loginAs(budi);
      await home.goto();

      await expect(home.recentItems).toHaveCount(5);
      expect(await home.recentNotes()).toEqual([
        "Nonton",
        "Makan siang",
        "Ojek",
        "Belanja bulanan",
        "Listrik",
      ]);
      const first = home.recentItems.first();
      await expect(first.getByTestId("transaction-amount")).toHaveText(
        /^−\s*(Pengeluaran\s*)?Rp 100\.000$/,
      );
      await expect(first.getByTestId("transaction-category")).toHaveText(
        "Hiburan",
      );
      await expect(first).toHaveAttribute("data-date", day(14));
      await expect(home.item("Gaji Oktober")).toHaveCount(0);
    });

    test("transaksi tanpa catatan menampilkan nama kategori; pemasukan bertanda +", async ({
      db,
      createUser,
      loginAs,
    }) => {
      const ani = await createUser("ani", "Ani Wijaya");
      await db.insertTransactions(ani.id, [
        {
          date: day(1),
          type: "EXPENSE",
          category: "Kesehatan",
          amount: 75_000,
        },
        { date: day(1), type: "INCOME", category: "Bonus", amount: 300_000 },
      ]);
      await loginAs(ani);
      await home.goto();

      await expect(home.recentItems).toHaveCount(2);
      expect(await home.recentNotes()).toEqual(["Bonus", "Kesehatan"]);
      await expect(
        home.recentItems.first().getByTestId("transaction-amount"),
      ).toHaveAttribute("data-type", "income");
      await expect(
        home.recentItems.first().getByTestId("transaction-amount"),
      ).toContainText("+");
    });

    test("transaksi terbaru lintas bulan: bulan ini Rp 0, transaksi bulan lalu tetap tampil", async ({
      db,
      createUser,
      loginAs,
    }) => {
      const ani = await createUser("ani", "Ani Wijaya");
      await db.insertTransactions(ani.id, [
        {
          date: `${PREV}-20`,
          type: "EXPENSE",
          category: "Belanja",
          amount: 120_000,
          note: "Belanja bulan lalu",
        },
      ]);
      await loginAs(ani);
      await home.goto();

      await expect(home.expenseTotal).toHaveText("Rp 0");
      await expect(home.balance).toHaveText("Rp 0");
      await expect(home.item("Belanja bulan lalu")).toHaveCount(1);
      await expect(home.recentEmpty).toHaveCount(0);
    });

    test("ringkasan anggaran tampil jika anggaran sudah diatur", async ({
      page,
      db,
      loginAs,
    }) => {
      await db.insertBudgets(budi.id, [
        { month: CURRENT, category: "Makan & Minum", amount: 1_500_000 },
        { month: CURRENT, category: "Belanja", amount: 1_000_000 },
        { month: CURRENT, category: "Transportasi", amount: 500_000 },
        // Anggaran bulan lalu tidak ikut dihitung.
        { month: PREV, category: "Belanja", amount: 9_000_000 },
      ]);
      await loginAs(budi);
      await home.goto();

      await expect(home.budgetText).toHaveText("Rp 943.000 dari Rp 3.000.000");
      await expect(home.budgetPercent).toHaveText("31%");
      await expect(home.budgetCard).toHaveAttribute("data-status", "green");
      await expect(home.budgetProgress).toHaveAttribute("data-value", "31");
      await expect(home.budgetRemaining).toHaveText("Sisa Rp 2.057.000");
      await expect(home.budgetSetupCta).toHaveCount(0);

      await home.budgetLink.click();
      await expect(page).toHaveURL((url) => url.pathname === "/budgets");
      await expect(page.getByTestId("page-title")).toHaveText("Anggaran");
    });

    test("ringkasan anggaran terlampaui memakai status E03-US02", async ({
      db,
      loginAs,
    }) => {
      // Total terpakai = seluruh pengeluaran bulan (termasuk kategori tanpa
      // anggaran): 943.000 dari 900.000 → 104%, merah, Lebih Rp 43.000.
      await db.insertBudgets(budi.id, [
        { month: CURRENT, category: "Belanja", amount: 900_000 },
      ]);
      await loginAs(budi);
      await home.goto();

      await expect(home.budgetText).toHaveText("Rp 943.000 dari Rp 900.000");
      await expect(home.budgetPercent).toHaveText("104%");
      await expect(home.budgetCard).toHaveAttribute("data-status", "red");
      await expect(home.budgetProgress).toHaveAttribute("data-value", "100");
      await expect(home.budgetRemaining).toHaveText("Lebih Rp 43.000");
      await expect(home.budgetRemaining).toHaveAttribute("data-tone", "red");
      await expect(
        home.page.getByTestId("budget-summary-status-label"),
      ).toHaveText("Terlampaui");
    });

    test("ajakan mengatur anggaran jika belum ada anggaran bulan ini", async ({
      page,
      db,
      loginAs,
    }) => {
      await db.insertBudgets(budi.id, [
        { month: PREV, category: "Belanja", amount: 1_000_000 },
      ]);
      await loginAs(budi);
      await home.goto();

      await expect(home.budgetSetupCta).toContainText(
        "Atur anggaran bulan ini",
      );
      await expect(home.budgetCard).toHaveCount(0);
      await home.budgetSetupCta.click();
      await expect(page).toHaveURL((url) => url.pathname === "/budgets");
    });

    test("link Lihat semua membuka tab Transaksi", async ({
      page,
      loginAs,
      isMobile,
    }) => {
      await loginAs(budi);
      await home.goto();

      await home.seeAll.click();
      await expect(page).toHaveURL(
        (url) => url.pathname === "/transactions" && url.search === "",
      );
      const shell = new AppShell(page);
      await expect(
        isMobile
          ? shell.bottomNav("transactions")
          : shell.sidebarNav("transactions"),
      ).toHaveAttribute("aria-current", "page");
    });

    test("ringkasan ter-update setelah mencatat pengeluaran", async ({
      page,
      db,
      loginAs,
    }) => {
      await db.insertBudgets(budi.id, [
        { month: CURRENT, category: "Belanja", amount: 3_000_000 },
      ]);
      await loginAs(budi);
      await home.goto();
      await expect(home.expenseTotal).toHaveText("Rp 943.000");

      const form = new TransactionFormPage(page);
      await form.addExpense({
        amount: "50000",
        category: "makan-minum",
        note: "Kopi",
      });

      await expect(home.expenseTotal).toHaveText("Rp 993.000");
      await expect(home.balance).toHaveText("+ Rp 7.007.000");
      await expect(home.budgetText).toHaveText("Rp 993.000 dari Rp 3.000.000");
      await expect(home.recentItems).toHaveCount(5);
      await expect(
        home.recentItems.first().getByTestId("transaction-note"),
      ).toHaveText("Kopi");
      await expect(home.item("Listrik")).toHaveCount(0);
      await expect(page).toHaveURL((url) => url.pathname === "/");
    });
  });

  test.describe("@empty-state", () => {
    test("pengguna baru tanpa transaksi", async ({
      page,
      createUser,
      loginAs,
    }) => {
      const baru = await createUser("baru", "Pengguna Baru");
      await loginAs(baru);
      await home.goto();

      await expect(home.incomeTotal).toHaveText("Rp 0");
      await expect(home.expenseTotal).toHaveText("Rp 0");
      await expect(home.balance).toHaveText("Rp 0");
      await expect(home.balance).toHaveAttribute("data-state", "zero");
      await expect(home.emptyMessage).toHaveText(
        "Belum ada transaksi, catat pengeluaran pertamamu",
      );
      await expect(home.recentItems).toHaveCount(0);
      await expect(home.seeAll).toHaveCount(0);
      await expect(home.budgetSetupCta).toBeVisible();

      await home.emptyCta.click();
      const form = new TransactionFormPage(page);
      await expect(form.dialog).toBeVisible();
      await expect(form.title).toHaveText("Catat Pengeluaran");
      await expect(form.amountInput).toBeFocused();

      // Setelah transaksi pertama tersimpan, empty state diganti daftar.
      await form.fill({
        amount: "15000",
        category: "transportasi",
        note: "Bus",
      });
      await form.submit();
      await expect(home.expenseTotal).toHaveText("Rp 15.000");
      await expect(home.recentEmpty).toHaveCount(0);
      await expect(home.item("Bus")).toHaveCount(1);
    });
  });

  test.describe("@error-handling", () => {
    test("gagal memuat ringkasan → pesan + Coba lagi", async ({
      page,
      loginAs,
      baseURL,
    }) => {
      await loginAs(budi);
      // Simulasi server gagal (hanya aktif di server E2E, lihat
      // apps/web/src/lib/fault-injection.ts).
      await page
        .context()
        .addCookies([
          { name: "e2e-fault", value: "dashboard-load", url: baseURL! },
        ]);
      await home.goto();

      await expect(home.loadError).toContainText(
        "Gagal memuat ringkasan. Periksa koneksi lalu coba lagi.",
      );
      await expect(home.retryButton).toHaveText("Coba lagi");
      await expect(home.incomeTotal).toHaveCount(0);
      // Navigasi dan FAB tetap bisa dipakai.
      await expect(home.fab).toBeVisible();
      await expect(home.period).toHaveText(monthLabel(CURRENT));

      // Server pulih → Coba lagi memuat ringkasan.
      await page.context().clearCookies({ name: "e2e-fault" });
      await home.retryButton.click();
      await expect(home.expenseTotal).toHaveText("Rp 943.000");
      await expect(home.loadError).toHaveCount(0);
      await expect(home.recentItems).toHaveCount(5);
    });
  });

  test.describe("@security", () => {
    test("ringkasan tidak menghitung data pengguna lain", async ({
      db,
      createUser,
      loginAs,
    }) => {
      await db.insertBudgets(budi.id, [
        { month: CURRENT, category: "Belanja", amount: 3_000_000 },
      ]);
      const ani = await createUser("ani", "Ani Wijaya");
      await loginAs(ani);
      await home.goto();

      await expect(home.incomeTotal).toHaveText("Rp 0");
      await expect(home.expenseTotal).toHaveText("Rp 0");
      await expect(home.balance).toHaveText("Rp 0");
      await expect(home.item("Makan siang")).toHaveCount(0);
      await expect(home.recentItems).toHaveCount(0);
      await expect(home.recentEmpty).toBeVisible();
      // Anggaran milik budi tidak terlihat.
      await expect(home.budgetCard).toHaveCount(0);
      await expect(home.budgetSetupCta).toBeVisible();
    });
  });
});
