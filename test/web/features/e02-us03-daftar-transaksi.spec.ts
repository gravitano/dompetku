/**
 * E02-US03 Daftar transaksi dengan filter — docs/features/phase-01-mvp/
 * e-02---pencatatan-transaksi/e02-us03--daftar-transaksi---testing.md
 *
 * Skenario @smoke "Menampilkan transaksi bulan berjalan per tanggal" ada di
 * `test/web/smoke/daftar-transaksi.spec.ts`.
 *
 * Data uji: tiap test membuat akun baru (`createUser`) dan transaksi Background
 * di-insert langsung lewat fixture `db`. Server memakai jam sistem (RSC),
 * sehingga "hari ini" = tanggal hari ini (Asia/Jakarta) dan tanggal Background
 * dibuat relatif terhadapnya; nilai harapan dihitung dari fixture.
 */
import type { Page } from "@playwright/test";

import { expect, test, type CreatedUser } from "../fixtures";
import type { SeedTransaction, TestDb } from "../fixtures/db";
import { AppShell } from "../pages/app-shell";
import { jakartaDate } from "../pages/home-page";
import { TransactionFormPage } from "../pages/transaction-form";
import {
  dayLabel,
  monthLabel,
  rupiah,
  shiftMonth,
  TransactionsPage,
} from "../pages/transactions-page";

const TODAY = jakartaDate(0);
const CURRENT_MONTH = TODAY.slice(0, 7);
const DAY = Number(TODAY.slice(8, 10));
const PREV_MONTH = shiftMonth(CURRENT_MONTH, -1);
/** Tanggal di bulan berjalan, `daysAgo` hari sebelum hari ini (min. tgl 1). */
const monthDate = (daysAgo: number) => jakartaDate(-Math.min(daysAgo, DAY - 1));

/** Background testing.md (tanggal relatif terhadap hari ini). */
const BACKGROUND: SeedTransaction[] = [
  {
    date: PREV_MONTH + "-" + lastDayOf(PREV_MONTH),
    type: "EXPENSE",
    category: "Belanja",
    amount: 200_000,
    note: "Belanja bulanan",
  },
  {
    date: monthDate(20),
    type: "EXPENSE",
    category: "Tagihan",
    amount: 350_000,
    note: "Listrik",
  },
  {
    date: monthDate(5),
    type: "INCOME",
    category: "Gaji",
    amount: 8_000_000,
    note: "Gaji September",
  },
  {
    date: TODAY,
    type: "EXPENSE",
    category: "Makan & Minum",
    amount: 25_000,
    note: "Makan siang",
  },
  // Dicatat paling akhir → tampil paling atas di tanggal yang sama.
  {
    date: TODAY,
    type: "EXPENSE",
    category: "Transportasi",
    amount: 18_000,
    note: "Ojek",
  },
];
const CURRENT = BACKGROUND.filter((t) => t.date.startsWith(CURRENT_MONTH));
const sum = (rows: SeedTransaction[], type: "INCOME" | "EXPENSE") =>
  rows.filter((t) => t.type === type).reduce((s, t) => s + t.amount, 0);

function lastDayOf(month: string): string {
  const d = new Date(`${shiftMonth(month, 1)}-01T00:00:00Z`);
  d.setUTCDate(0);
  return String(d.getUTCDate()).padStart(2, "0");
}

async function expectSummary(
  list: TransactionsPage,
  { income, expense }: { income: number; expense: number },
) {
  await expect(list.summaryIncome).toHaveText(rupiah(income));
  await expect(list.summaryExpense).toHaveText(rupiah(expense));
  const net = income - expense;
  await expect(list.summaryNet).toHaveText(
    net < 0 ? `− ${rupiah(net)}` : rupiah(net),
  );
}

/** Semua catatan yang tampil sama persis (tanpa memperhatikan urutan). */
async function expectNotes(list: TransactionsPage, notes: string[]) {
  await expect(list.rows).toHaveCount(notes.length);
  expect((await list.notes()).toSorted()).toEqual(notes.toSorted());
}

/** Kegagalan Server Action (HTTP 500) — simulasi "server gagal merespons". */
async function failServerActions(page: Page) {
  await page.route("**/*", async (route) => {
    const request = route.request();
    if (request.method() === "POST" && request.headers()["next-action"]) {
      await route.fulfill({ status: 500, body: "Internal Server Error" });
      return;
    }
    await route.fallback();
  });
}

test.describe("Daftar transaksi dengan filter", () => {
  let user: CreatedUser;
  let list: TransactionsPage;

  test.beforeEach(async ({ page, db, createUser, loginAs }) => {
    user = await createUser("budi");
    await db.insertTransactions(user.id, BACKGROUND);
    await loginAs(user);
    list = new TransactionsPage(page);
  });

  test.describe("@happy-path", () => {
    test("dibuka dari tab Transaksi: urutan, grup tanggal & baris", async ({
      page,
      isMobile,
    }) => {
      await page.goto("/");
      const shell = new AppShell(page);
      await (
        isMobile
          ? shell.bottomNav("transactions")
          : shell.sidebarNav("transactions")
      ).click();
      await expect(page).toHaveURL((url) => url.pathname === "/transactions");

      await expect(list.monthLabel).toHaveText(monthLabel(CURRENT_MONTH));
      const dates = [...new Set(CURRENT.map((t) => t.date))].toSorted((a, b) =>
        b.localeCompare(a),
      );
      await expect(list.groups).toHaveCount(dates.length);
      await expect(
        list.groups.getByTestId("transaction-group-label"),
      ).toHaveText(dates.map(dayLabel));
      // Tanggal sama: yang terakhir dicatat di atas.
      const today = list.group(TODAY);
      await expect(today.getByTestId("transaction-note")).toHaveText([
        "Ojek",
        "Makan siang",
      ]);
      await expect(today.getByTestId("transaction-group-total")).toHaveText(
        `− ${rupiah(43_000)}`,
      );

      // Baris: nama kategori, catatan, dan nominal bertanda.
      const ojek = list.row("Ojek");
      await expect(ojek.getByTestId("transaction-category")).toHaveText(
        "Transportasi",
      );
      await expect(ojek).toHaveAttribute("data-type", "expense");
      await expect(ojek.getByTestId("transaction-amount")).toHaveText(
        /^− .*Rp 18\.000$/,
      );
      const gaji = list.row("Gaji September");
      await expect(gaji).toHaveAttribute("data-type", "income");
      await expect(gaji.getByTestId("transaction-amount")).toHaveText(
        /^\+ .*Rp 8\.000\.000$/,
      );
      await expect(list.listEnd).toHaveText(
        "Semua transaksi sudah ditampilkan",
      );
    });

    test("catatan kosong → baris menampilkan nama kategori", async ({
      page,
      db,
    }) => {
      await db.insertTransactions(user.id, [
        { date: TODAY, type: "EXPENSE", category: "Hiburan", amount: 60_000 },
      ]);
      await list.goto();
      const row = list.rows.first();
      await expect(row.getByTestId("transaction-note")).toHaveText("Hiburan");
      await expect(row.getByTestId("transaction-category")).toHaveText(
        "Hiburan",
      );
      await expect(page.getByText("Belanja bulanan")).toHaveCount(0);
    });

    test("pindah ke bulan sebelumnya", async ({ page }) => {
      await list.goto();
      await list.monthPrev.click();

      await expect(list.monthLabel).toHaveText(monthLabel(PREV_MONTH));
      await expect(page).toHaveURL(
        (url) => url.searchParams.get("month") === PREV_MONTH,
      );
      await expectNotes(list, ["Belanja bulanan"]);
      await expectSummary(list, { income: 0, expense: 200_000 });
      await expect(list.monthNext).toBeEnabled();

      await list.monthNext.click();
      await expect(list.monthLabel).toHaveText(monthLabel(CURRENT_MONTH));
      await expect(list.rows).toHaveCount(CURRENT.length);
      await expect(page).toHaveURL((url) => url.search === "");
    });

    test("filter berdasarkan jenis", async ({ page }) => {
      await list.goto();
      await list.applyFilter({ type: "income" });

      await expectNotes(list, ["Gaji September"]);
      await expectSummary(list, { income: 8_000_000, expense: 0 });
      await expect(list.chip("type")).toHaveText("Pemasukan");
      await expect(list.filterBadge).toHaveText("1");
      await expect(page).toHaveURL(
        (url) => url.searchParams.get("type") === "income",
      );
    });

    test("filter berdasarkan beberapa kategori", async () => {
      await list.goto();
      await list.applyFilter({ categories: ["makan-minum", "transportasi"] });

      await expectNotes(list, ["Makan siang", "Ojek"]);
      await expectSummary(list, { income: 0, expense: 43_000 });
      await expect(list.chip("makan-minum")).toHaveText("Makan & Minum");
      await expect(list.chip("transportasi")).toHaveText("Transportasi");
      await expect(list.filterBadge).toHaveText("2");
    });

    test("filter tetap berlaku saat pindah bulan", async () => {
      await list.goto();
      await list.applyFilter({ categories: ["belanja"] });
      await expect(list.emptyMessage).toHaveText(
        "Tidak ada transaksi yang cocok dengan filter",
      );

      await list.monthPrev.click();
      await expect(list.monthLabel).toHaveText(monthLabel(PREV_MONTH));
      await expectNotes(list, ["Belanja bulanan"]);
      await expect(list.chip("belanja")).toBeVisible();
    });

    test("menghapus filter lewat chip dan reset", async () => {
      await list.goto();
      await list.applyFilter({ type: "expense", categories: ["tagihan"] });
      await expectNotes(list, ["Listrik"]);

      await list.chip("tagihan").click();
      await expect(list.chip("tagihan")).toHaveCount(0);
      await expect(list.chip("type")).toHaveText("Pengeluaran");
      await expectNotes(list, ["Makan siang", "Ojek", "Listrik"]);
      for (const row of await list.rows.all()) {
        await expect(row).toHaveAttribute("data-type", "expense");
      }

      await list.chipsReset.click();
      await expect(list.chips).toHaveCount(0);
      await expect(list.rows).toHaveCount(CURRENT.length);
      await expect(list.filterBadge).toHaveCount(0);
      await expectSummary(list, {
        income: sum(CURRENT, "INCOME"),
        expense: sum(CURRENT, "EXPENSE"),
      });
    });

    test("kategori terarsip tetap bisa difilter", async ({ db }) => {
      await db.archiveCategory(user.id, "Tagihan");
      await list.goto();
      await list.openFilter();

      const archived = list.page.getByTestId("filter-category-group-archived");
      await expect(archived).toContainText("Diarsipkan");
      await expect(
        archived.getByTestId("filter-category-tagihan"),
      ).toBeVisible();

      await list.category("tagihan").click();
      await list.filterApply.click();
      await expectNotes(list, ["Listrik"]);
      await expect(list.chip("tagihan")).toBeVisible();
      await expect(list.row("Listrik")).toContainText("Diarsipkan");
    });

    test("pilihan jenis di panel menyaring daftar kategori (UX-07)", async () => {
      await list.goto();
      await list.openFilter();
      await expect(list.typeOption("all")).toHaveAttribute(
        "aria-checked",
        "true",
      );
      await list.category("makan-minum").click();
      await expect(list.category("gaji")).toBeVisible();

      await list.typeOption("income").click();
      await expect(list.category("gaji")).toBeVisible();
      await expect(list.category("makan-minum")).toHaveCount(0);
      await list.typeOption("expense").click();
      // Pilihan kategori jenis lain dilepas saat jenis diganti.
      await expect(list.category("makan-minum")).toHaveAttribute(
        "aria-checked",
        "false",
      );
      await expect(list.category("gaji")).toHaveCount(0);
    });

    test("daftar terbuka dengan filter bulan + kategori dari URL (AC 12)", async ({
      page,
      db,
    }) => {
      const belanja = await db.getCategoryId(user.id, "Belanja");
      await list.goto(`?month=${PREV_MONTH}&category=${belanja}`);

      await expect(list.monthLabel).toHaveText(monthLabel(PREV_MONTH));
      await expect(list.chip("belanja")).toHaveText("Belanja");
      await expectNotes(list, ["Belanja bulanan"]);

      // Bertahan saat refresh.
      await page.reload();
      await expect(list.monthLabel).toHaveText(monthLabel(PREV_MONTH));
      await expect(list.chip("belanja")).toBeVisible();
      await expectNotes(list, ["Belanja bulanan"]);

      // Bisa di-reset; bulan tetap.
      await list.chipsReset.click();
      await expect(list.chips).toHaveCount(0);
      await expect(page).toHaveURL(
        (url) =>
          url.searchParams.get("month") === PREV_MONTH &&
          !url.searchParams.has("category"),
      );
      await expect(list.monthLabel).toHaveText(monthLabel(PREV_MONTH));
    });

    test("tap baris membuka detail transaksi, kembali ke daftar terfilter", async ({
      page,
    }) => {
      await list.goto();
      await list.applyFilter({ categories: ["tagihan"] });
      await expect(page).toHaveURL((u) => u.searchParams.has("category"));
      await expectNotes(list, ["Listrik"]);
      const url = page.url();
      await list.row("Listrik").click();

      const detail = page.getByTestId("transaction-detail");
      await expect(detail).toBeVisible();
      await expect(page.getByTestId("page-title")).toHaveText(
        "Detail Transaksi",
      );
      await expect(detail.getByTestId("transaction-amount")).toHaveText(
        /^− .*Rp 350\.000$/,
      );
      await expect(
        page.getByTestId("transaction-detail-category"),
      ).toContainText("Tagihan");
      await expect(page.getByTestId("transaction-detail-note")).toContainText(
        "Listrik",
      );

      await page.getByTestId("transaction-detail-back").click();
      await expect(page).toHaveURL(url);
      await expect(list.chip("tagihan")).toBeVisible();
    });

    test("transaksi baru langsung muncul tanpa reload", async ({ page }) => {
      await list.goto();
      const form = new TransactionFormPage(page);
      await form.addExpense({
        amount: "12000",
        category: "hiburan",
        note: "Bioskop",
      });

      await expect(form.toast("Pengeluaran tersimpan")).toBeVisible();
      await expect(
        list.group(TODAY).getByTestId("transaction-note").first(),
      ).toHaveText("Bioskop");
      await expectSummary(list, {
        income: sum(CURRENT, "INCOME"),
        expense: sum(CURRENT, "EXPENSE") + 12_000,
      });
    });
  });

  test.describe("@validation", () => {
    test("tidak bisa pindah ke bulan setelah bulan berjalan", async ({
      page,
    }) => {
      await list.goto();
      await expect(list.monthNext).toBeDisabled();

      // Bulan masa depan di URL → bulan berjalan.
      await list.goto(`?month=${shiftMonth(CURRENT_MONTH, 1)}`);
      await expect(list.monthLabel).toHaveText(monthLabel(CURRENT_MONTH));
      await expect(list.monthNext).toBeDisabled();
      await expect(page.getByText("Belanja bulanan")).toHaveCount(0);
    });

    test("parameter URL tidak valid diabaikan", async () => {
      await list.goto("?month=abc&type=transfer&category=bukan-uuid");
      await expect(list.monthLabel).toHaveText(monthLabel(CURRENT_MONTH));
      await expect(list.chips).toHaveCount(0);
      await expect(list.rows).toHaveCount(CURRENT.length);
    });
  });

  test.describe("@empty-state", () => {
    test("bulan tanpa transaksi", async ({ page }) => {
      const empty = shiftMonth(CURRENT_MONTH, -2);
      await list.goto(`?month=${empty}`);

      await expect(list.monthLabel).toHaveText(monthLabel(empty));
      await expect(list.emptyMessage).toHaveText(
        `Belum ada transaksi di ${monthLabel(empty)}`,
      );
      await expect(list.emptyAdd).toHaveText("Catat transaksi");
      await expectSummary(list, { income: 0, expense: 0 });
      await expect(list.summaryNet).toHaveText("Rp 0");

      await list.emptyAdd.click();
      await expect(new TransactionFormPage(page).dialog).toBeVisible();
    });

    test("filter tanpa hasil", async () => {
      await list.goto();
      await list.applyFilter({ categories: ["kesehatan"] });

      await expect(list.emptyMessage).toHaveText(
        "Tidak ada transaksi yang cocok dengan filter",
      );
      await expect(list.emptyReset).toHaveText("Reset filter");
      await expectSummary(list, { income: 0, expense: 0 });

      await list.emptyReset.click();
      await expect(list.rows).toHaveCount(CURRENT.length);
      await expect(list.chips).toHaveCount(0);
    });
  });

  test.describe("@security", () => {
    test("daftar hanya berisi transaksi milik sendiri", async ({
      page,
      db,
      createUser,
    }) => {
      const ani = await createUser("ani", "Ani Wijaya");
      await db.insertTransactions(ani.id, [
        {
          date: TODAY,
          type: "EXPENSE",
          category: "Belanja",
          amount: 999_000,
          note: "Belanja Ani",
        },
      ]);
      const aniBelanja = await db.getCategoryId(ani.id, "Belanja");
      const [aniTransaction] = await db.getTransactions(ani.id);

      await list.goto();
      await expect(list.rows).toHaveCount(CURRENT.length);
      await expect(page.getByText("Belanja Ani")).toHaveCount(0);
      await expectSummary(list, {
        income: sum(CURRENT, "INCOME"),
        expense: sum(CURRENT, "EXPENSE"),
      });

      // Id kategori milik user lain di URL diabaikan (tanpa chip / data).
      await list.goto(`?category=${aniBelanja}`);
      await expect(list.chips).toHaveCount(0);
      await expect(list.rows).toHaveCount(CURRENT.length);
      await expect(page.getByText("Belanja Ani")).toHaveCount(0);

      // Detail transaksi milik user lain → tidak ditemukan.
      await page.goto(`/transactions/${aniTransaction.id}`);
      await expect(page.getByTestId("transaction-not-found")).toBeVisible();
      await expect(page.getByTestId("page-title")).toHaveText(
        "Transaksi tidak ditemukan",
      );
      await expect(page.getByText("Belanja Ani")).toHaveCount(0);
    });
  });
});

test.describe("Daftar transaksi — pagination & error", () => {
  const COUNT = 120;
  const AMOUNT = 10_000;

  async function seedMany(db: TestDb, userId: string) {
    // 120 pengeluaran tersebar di tanggal bulan berjalan (≤ hari ini).
    await db.insertTransactions(
      userId,
      Array.from({ length: COUNT }, (_, i) => ({
        date: monthDate(Math.floor(i / 10)),
        type: "EXPENSE" as const,
        category: "Makan & Minum",
        amount: AMOUNT,
        note: `Jajan ${String(i + 1).padStart(3, "0")}`,
      })),
    );
  }

  test("@pagination infinite scroll dengan ringkasan tetap akurat", async ({
    page,
    db,
    createUser,
    loginAs,
  }) => {
    const user = await createUser("budi");
    await seedMany(db, user.id);
    await loginAs(user);
    const list = new TransactionsPage(page);
    await list.goto();

    await expect(list.rows).toHaveCount(50);
    await expect(list.summaryExpense).toHaveText(rupiah(COUNT * AMOUNT));
    await expect(list.listEnd).toHaveCount(0);

    await list.sentinel.scrollIntoViewIfNeeded();
    await expect(list.rows).toHaveCount(100);
    await list.sentinel.scrollIntoViewIfNeeded();
    await expect(list.rows).toHaveCount(COUNT);
    await expect(list.listEnd).toHaveText("Semua transaksi sudah ditampilkan");

    // Urutan stabil tanpa duplikat: sama dengan urutan database.
    const expected = (await db.getTransactions(user.id)).map((t) => t.note);
    expect(await list.notes()).toEqual(expected);
    await expect(list.summaryExpense).toHaveText(rupiah(COUNT * AMOUNT));
  });

  test("@error-handling gagal memuat → pesan + Coba lagi, data tetap", async ({
    page,
    db,
    createUser,
    loginAs,
  }) => {
    const user = await createUser("budi");
    await seedMany(db, user.id);
    await loginAs(user);
    const list = new TransactionsPage(page);
    await list.goto();
    await expect(list.rows).toHaveCount(50);

    await failServerActions(page);
    await list.sentinel.scrollIntoViewIfNeeded();

    await expect(list.listError).toContainText("Gagal memuat transaksi.");
    await expect(list.listRetry).toHaveText("Coba lagi");
    await expect(list.rows).toHaveCount(50);

    // Server pulih → Coba lagi memuat halaman berikutnya.
    await page.unrouteAll({ behavior: "wait" });
    await list.listRetry.click();
    await expect(list.rows).toHaveCount(100);
    await expect(list.listError).toHaveCount(0);
  });
});
