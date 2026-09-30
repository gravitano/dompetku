/**
 * E02-US03 Daftar transaksi dengan filter — docs/features/phase-01-mvp/
 * e-02---pencatatan-transaksi/e02-us03--daftar-transaksi---testing.md
 *
 * Skenario @smoke "Menampilkan transaksi bulan berjalan per tanggal" ada di
 * `test/web/smoke/daftar-transaksi.spec.ts`.
 *
 * Data uji: tiap test membuat akun baru (`createUser`) dan transaksi Background
 * di-insert langsung lewat fixture `db`.
 *
 * Determinisme tanggal: server memakai jam sistem (RSC), jadi `page.clock`
 * tidak berlaku. Background ditempatkan di **bulan lalu** (`BASE`, tanggal
 * tetap 28/25/10 yang ada di semua bulan) dan transaksi "Belanja bulanan" di
 * hari terakhir **dua bulan lalu** (`OLDER`). Daftar dibuka lewat
 * `?month=BASE` / tombol ◀ sehingga hasilnya sama di tanggal berapa pun
 * (termasuk tanggal 1). Skenario bulan berjalan hanya memakai tanggal hari ini.
 */
import type { Page } from "@playwright/test";

import { expect, test, type CreatedUser } from "../fixtures";
import type { SeedTransaction, TestDb } from "../fixtures/db";
import { AppShell } from "../pages/app-shell";
import { jakartaDate } from "../pages/home-page";
import { TransactionFormPage } from "../pages/transaction-form";
import {
  dayLabel,
  lastDayOfMonth,
  monthLabel,
  rupiah,
  shiftMonth,
  TransactionsPage,
} from "../pages/transactions-page";

const currentMonth = () => jakartaDate(0).slice(0, 7);
const BASE = shiftMonth(currentMonth(), -1);
const OLDER = shiftMonth(BASE, -1);
const on = (day: number) => `${BASE}-${String(day).padStart(2, "0")}`;

/** Background testing.md: "30 Sep" → BASE-28, "25 Sep" → BASE-25, dst. */
const BACKGROUND: SeedTransaction[] = [
  {
    date: lastDayOfMonth(OLDER),
    type: "EXPENSE",
    category: "Belanja",
    amount: 200_000,
    note: "Belanja bulanan",
  },
  {
    date: on(10),
    type: "EXPENSE",
    category: "Tagihan",
    amount: 350_000,
    note: "Listrik",
  },
  {
    date: on(25),
    type: "INCOME",
    category: "Gaji",
    amount: 8_000_000,
    note: "Gaji September",
  },
  {
    date: on(28),
    type: "EXPENSE",
    category: "Makan & Minum",
    amount: 25_000,
    note: "Makan siang",
  },
  // Dicatat paling akhir → tampil paling atas di tanggal yang sama.
  {
    date: on(28),
    type: "EXPENSE",
    category: "Transportasi",
    amount: 18_000,
    note: "Ojek",
  },
];
const IN_BASE = BACKGROUND.filter((t) => t.date.startsWith(BASE));
const sum = (rows: SeedTransaction[], type: "INCOME" | "EXPENSE") =>
  rows.filter((t) => t.type === type).reduce((s, t) => s + t.amount, 0);
const BASE_TOTALS = {
  income: sum(IN_BASE, "INCOME"),
  expense: sum(IN_BASE, "EXPENSE"),
};

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
    test("dibuka dari tab Transaksi: bulan berjalan default, ◀ ke bulan lalu per tanggal", async ({
      page,
      db,
      isMobile,
    }) => {
      const today = jakartaDate(0);
      await db.insertTransactions(user.id, [
        {
          date: today,
          type: "EXPENSE",
          category: "Hiburan",
          amount: 60_000,
          note: "Bioskop",
        },
      ]);
      await page.goto("/");
      const shell = new AppShell(page);
      await (
        isMobile
          ? shell.bottomNav("transactions")
          : shell.sidebarNav("transactions")
      ).click();
      await expect(page).toHaveURL((url) => url.pathname === "/transactions");

      // Default: bulan berjalan saja.
      await expect(list.monthLabel).toHaveText(monthLabel(today.slice(0, 7)));
      await expectNotes(list, ["Bioskop"]);
      await expect(
        list.groups.getByTestId("transaction-group-label"),
      ).toHaveText([dayLabel(today)]);
      await expectSummary(list, { income: 0, expense: 60_000 });

      // Bulan lalu: 4 transaksi dalam 3 kelompok, terbaru dulu.
      await list.monthPrev.click();
      await expect(list.monthLabel).toHaveText(monthLabel(BASE));
      await expect(list.rows).toHaveCount(IN_BASE.length);
      await expect(
        list.groups.getByTestId("transaction-group-label"),
      ).toHaveText([on(28), on(25), on(10)].map(dayLabel));
      // Tanggal sama: yang terakhir dicatat di atas.
      const day28 = list.group(on(28));
      await expect(day28.getByTestId("transaction-note")).toHaveText([
        "Ojek",
        "Makan siang",
      ]);
      await expect(day28.getByTestId("transaction-group-total")).toHaveText(
        `− ${rupiah(43_000)}`,
      );
      await expect(
        list.group(on(25)).getByTestId("transaction-group-total"),
      ).toHaveText(`+ ${rupiah(8_000_000)}`);
      await expect(page.getByText("Belanja bulanan")).toHaveCount(0);
      await expectSummary(list, BASE_TOTALS);

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

    test("catatan kosong → baris menampilkan nama kategori", async ({ db }) => {
      await db.insertTransactions(user.id, [
        { date: on(28), type: "EXPENSE", category: "Hiburan", amount: 60_000 },
      ]);
      await list.goto(`?month=${BASE}`);
      const row = list.rows.first();
      await expect(row.getByTestId("transaction-note")).toHaveText("Hiburan");
      await expect(row.getByTestId("transaction-category")).toHaveText(
        "Hiburan",
      );
    });

    test("pindah ke bulan sebelumnya", async ({ page }) => {
      await list.goto(`?month=${BASE}`);
      await list.monthPrev.click();

      await expect(list.monthLabel).toHaveText(monthLabel(OLDER));
      await expect(page).toHaveURL(
        (url) => url.searchParams.get("month") === OLDER,
      );
      await expectNotes(list, ["Belanja bulanan"]);
      await expectSummary(list, { income: 0, expense: 200_000 });
      await expect(list.monthNext).toBeEnabled();

      await list.monthNext.click();
      await expect(list.monthLabel).toHaveText(monthLabel(BASE));
      await expect(list.rows).toHaveCount(IN_BASE.length);
    });

    test("filter berdasarkan jenis", async ({ page }) => {
      await list.goto(`?month=${BASE}`);
      await list.applyFilter({ type: "income" });

      await expectNotes(list, ["Gaji September"]);
      await expectSummary(list, { income: 8_000_000, expense: 0 });
      await expect(list.chip("type")).toHaveText("Pemasukan");
      await expect(list.filterBadge).toHaveText("1");
      await expect(page).toHaveURL(
        (url) =>
          url.searchParams.get("type") === "income" &&
          url.searchParams.get("month") === BASE,
      );
    });

    test("filter berdasarkan beberapa kategori", async () => {
      await list.goto(`?month=${BASE}`);
      await list.applyFilter({ categories: ["makan-minum", "transportasi"] });

      await expectNotes(list, ["Makan siang", "Ojek"]);
      await expectSummary(list, { income: 0, expense: 43_000 });
      await expect(list.chip("makan-minum")).toHaveText("Makan & Minum");
      await expect(list.chip("transportasi")).toHaveText("Transportasi");
      await expect(list.filterBadge).toHaveText("2");
    });

    test("filter tetap berlaku saat pindah bulan", async () => {
      await list.goto(`?month=${BASE}`);
      await list.applyFilter({ categories: ["belanja"] });
      await expect(list.emptyMessage).toHaveText(
        "Tidak ada transaksi yang cocok dengan filter",
      );

      await list.monthPrev.click();
      await expect(list.monthLabel).toHaveText(monthLabel(OLDER));
      await expectNotes(list, ["Belanja bulanan"]);
      await expect(list.chip("belanja")).toBeVisible();
    });

    test("menghapus filter lewat chip dan reset", async () => {
      await list.goto(`?month=${BASE}`);
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
      await expect(list.rows).toHaveCount(IN_BASE.length);
      await expect(list.filterBadge).toHaveCount(0);
      await expect(list.monthLabel).toHaveText(monthLabel(BASE));
      await expectSummary(list, BASE_TOTALS);
    });

    test("kategori terarsip tetap bisa difilter", async ({ db }) => {
      await db.archiveCategory(user.id, "Tagihan");
      await list.goto(`?month=${BASE}`);
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
      await list.goto(`?month=${OLDER}&category=${belanja}`);

      await expect(list.monthLabel).toHaveText(monthLabel(OLDER));
      await expect(list.chip("belanja")).toHaveText("Belanja");
      await expectNotes(list, ["Belanja bulanan"]);

      // Bertahan saat refresh.
      await page.reload();
      await expect(list.monthLabel).toHaveText(monthLabel(OLDER));
      await expect(list.chip("belanja")).toBeVisible();
      await expectNotes(list, ["Belanja bulanan"]);

      // Bisa di-reset; bulan tetap.
      await list.chipsReset.click();
      await expect(list.chips).toHaveCount(0);
      await expect(page).toHaveURL(
        (url) =>
          url.searchParams.get("month") === OLDER &&
          !url.searchParams.has("category"),
      );
      await expect(list.monthLabel).toHaveText(monthLabel(OLDER));
    });

    test("tap baris membuka detail transaksi, kembali ke daftar terfilter", async ({
      page,
    }) => {
      await list.goto(`?month=${BASE}`);
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

      // Kembali memakai filter yang dibawa tautan (bukan riwayat browser).
      await page.getByTestId("transaction-detail-back").click();
      await expect(page).toHaveURL(url);
      await expect(list.chip("tagihan")).toBeVisible();
      await expectNotes(list, ["Listrik"]);
    });

    test("detail dibuka lewat tautan langsung → Kembali ke daftar bulan transaksi", async ({
      page,
      db,
    }) => {
      const listrik = (await db.getTransactions(user.id)).find(
        (t) => t.note === "Listrik",
      )!;
      // Tab baru tanpa riwayat daftar sebelumnya.
      await page.goto(`/transactions/${listrik.id}`);
      await page.getByTestId("transaction-detail-back").click();

      await expect(page).toHaveURL(
        (url) =>
          url.pathname === "/transactions" &&
          url.searchParams.get("month") === BASE,
      );
      await expect(list.monthLabel).toHaveText(monthLabel(BASE));
      await expect(list.chips).toHaveCount(0);
    });

    test("transaksi baru langsung muncul tanpa reload", async ({ page }) => {
      await list.goto();
      await expect(list.emptyMessage).toBeVisible();
      const form = new TransactionFormPage(page);
      await form.addExpense({
        amount: "12000",
        category: "hiburan",
        note: "Bioskop",
      });

      await expect(form.toast("Pengeluaran tersimpan")).toBeVisible();
      await expect(
        list.group(jakartaDate(0)).getByTestId("transaction-note"),
      ).toHaveText(["Bioskop"]);
      await expectSummary(list, { income: 0, expense: 12_000 });
    });
  });

  test.describe("@validation", () => {
    test("tidak bisa pindah ke bulan setelah bulan berjalan", async ({
      page,
    }) => {
      await list.goto(`?month=${BASE}`);
      await expect(list.monthNext).toBeEnabled();
      await list.monthNext.click();
      await expect(list.monthLabel).toHaveText(monthLabel(currentMonth()));
      await expect(list.monthNext).toBeDisabled();

      // Bulan masa depan di URL → bulan berjalan.
      await list.goto(`?month=${shiftMonth(currentMonth(), 1)}`);
      await expect(list.monthLabel).toHaveText(monthLabel(currentMonth()));
      await expect(list.monthNext).toBeDisabled();
      await expect(page.getByText("Listrik")).toHaveCount(0);
    });

    test("parameter URL tidak valid diabaikan", async () => {
      await list.goto("?month=abc&type=transfer&category=bukan-uuid");
      await expect(list.monthLabel).toHaveText(monthLabel(currentMonth()));
      await expect(list.chips).toHaveCount(0);
      await expect(list.filterBadge).toHaveCount(0);
    });
  });

  test.describe("@empty-state", () => {
    test("bulan tanpa transaksi", async ({ page }) => {
      const empty = shiftMonth(OLDER, -1);
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
      await list.goto(`?month=${BASE}`);
      await list.applyFilter({ categories: ["kesehatan"] });

      await expect(list.emptyMessage).toHaveText(
        "Tidak ada transaksi yang cocok dengan filter",
      );
      await expect(list.emptyReset).toHaveText("Reset filter");
      await expectSummary(list, { income: 0, expense: 0 });

      await list.emptyReset.click();
      await expect(list.rows).toHaveCount(IN_BASE.length);
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
          date: on(28),
          type: "EXPENSE",
          category: "Belanja",
          amount: 999_000,
          note: "Belanja Ani",
        },
      ]);
      const aniBelanja = await db.getCategoryId(ani.id, "Belanja");
      const [aniTransaction] = await db.getTransactions(ani.id);

      await list.goto(`?month=${BASE}`);
      await expect(list.rows).toHaveCount(IN_BASE.length);
      await expect(page.getByText("Belanja Ani")).toHaveCount(0);
      await expectSummary(list, BASE_TOTALS);

      // Id kategori milik user lain di URL diabaikan (tanpa chip / data).
      await list.goto(`?month=${BASE}&category=${aniBelanja}`);
      await expect(list.chips).toHaveCount(0);
      await expect(list.rows).toHaveCount(IN_BASE.length);
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
  const PER_DAY = 12;
  /** Semua baris dicatat pada detik yang sama → urutan memakai id (tie-break). */
  const SAME_CREATED_AT = new Date("2026-01-01T00:00:00Z");
  /** Baris ke-i jatuh di tanggal BASE-(28 − ⌊i/12⌋): 28, 27, …, 19. */
  const dateOf = (i: number) => on(28 - Math.floor(i / PER_DAY));
  /** Grup 24 = baris 48–59 → terpotong antara halaman 1 (50) dan 2. */
  const SPLIT_DATE = dateOf(48);

  async function seedMany(db: TestDb, userId: string) {
    await db.insertTransactions(
      userId,
      Array.from({ length: COUNT }, (_, i) => ({
        date: dateOf(i),
        type: "EXPENSE" as const,
        category: "Makan & Minum",
        amount: AMOUNT,
        note: `Jajan ${String(i + 1).padStart(3, "0")}`,
        createdAt: SAME_CREATED_AT,
      })),
    );
  }

  test("@pagination infinite scroll dengan ringkasan & total harian tetap akurat", async ({
    page,
    db,
    createUser,
    loginAs,
  }) => {
    const user = await createUser("budi");
    await seedMany(db, user.id);
    await loginAs(user);
    const list = new TransactionsPage(page);
    await list.goto(`?month=${BASE}`);

    await expect(list.rows).toHaveCount(50);
    await expect(list.summaryExpense).toHaveText(rupiah(COUNT * AMOUNT));
    await expect(list.listEnd).toHaveCount(0);
    // Grup yang terpotong: baru 2 dari 12 baris tampil, total sudah penuh.
    const split = list.group(SPLIT_DATE);
    await expect(
      split.locator('[data-testid^="transaction-row-"]'),
    ).toHaveCount(2);
    await expect(split.getByTestId("transaction-group-total")).toHaveText(
      `− ${rupiah(PER_DAY * AMOUNT)}`,
    );

    await list.sentinel.scrollIntoViewIfNeeded();
    await expect(list.rows).toHaveCount(100);
    // Setelah load-more: tetap satu grup, 12 baris, total tidak berubah.
    await expect(list.group(SPLIT_DATE)).toHaveCount(1);
    await expect(
      split.locator('[data-testid^="transaction-row-"]'),
    ).toHaveCount(PER_DAY);
    await expect(split.getByTestId("transaction-group-total")).toHaveText(
      `− ${rupiah(PER_DAY * AMOUNT)}`,
    );

    await list.sentinel.scrollIntoViewIfNeeded();
    await expect(list.rows).toHaveCount(COUNT);
    await expect(list.listEnd).toHaveText("Semua transaksi sudah ditampilkan");
    await expect(list.groups).toHaveCount(COUNT / PER_DAY);
    for (const total of await list.groups
      .getByTestId("transaction-group-total")
      .allTextContents()) {
      expect(total).toBe(`− ${rupiah(PER_DAY * AMOUNT)}`);
    }

    // createdAt identik: urutan stabil (id) tanpa duplikat/terlewat antar
    // halaman — sama dengan urutan database.
    const expected = (await db.getTransactions(user.id)).map((t) => t.note);
    expect(await list.notes()).toEqual(expected);
    expect(new Set(expected).size).toBe(COUNT);
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
    await list.goto(`?month=${BASE}`);
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
