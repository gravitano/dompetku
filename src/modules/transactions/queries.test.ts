import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  groupBy: vi.fn(),
  findMany: vi.fn(),
  findFirst: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("~/lib/prisma", () => ({
  prisma: {
    transaction: {
      groupBy: mocks.groupBy,
      findMany: mocks.findMany,
      findFirst: mocks.findFirst,
    },
  },
}));

const {
  buildCursorWhere,
  buildTransactionListWhere,
  getMonthTotals,
  getTransactionDetail,
  getTransactionListPage,
  getTransactionListSummary,
} = await import("./queries");
const { TRANSACTION_PAGE_SIZE } = await import("./schema");

const NOW = new Date("2026-09-30T03:00:00Z"); // 30 Sep 10:00 WIB

describe("getMonthTotals", () => {
  beforeEach(() => vi.clearAllMocks());

  it("memisahkan total pemasukan & pengeluaran (E02-US02 AC 5–6)", async () => {
    mocks.groupBy.mockResolvedValue([
      { type: "EXPENSE", _sum: { amount: BigInt(25_000) } },
      { type: "INCOME", _sum: { amount: BigInt(8_000_000) } },
    ]);

    const totals = await getMonthTotals("user-budi", NOW);

    expect(totals).toEqual({
      month: new Date("2026-09-01T00:00:00Z"),
      income: BigInt(8_000_000),
      expense: BigInt(25_000),
    });
  });

  it("hanya ada pemasukan → total pengeluaran tetap 0", async () => {
    mocks.groupBy.mockResolvedValue([
      { type: "INCOME", _sum: { amount: BigInt(8_000_000) } },
    ]);

    const totals = await getMonthTotals("user-budi", NOW);

    expect(totals.income).toBe(BigInt(8_000_000));
    expect(totals.expense).toBe(BigInt(0));
  });

  it("belum ada transaksi → keduanya 0", async () => {
    mocks.groupBy.mockResolvedValue([]);
    const totals = await getMonthTotals("user-budi", NOW);
    expect(totals.income).toBe(BigInt(0));
    expect(totals.expense).toBe(BigInt(0));
  });

  it("hanya transaksi milik user pada bulan berjalan (zona Asia/Jakarta)", async () => {
    mocks.groupBy.mockResolvedValue([]);
    // 30 Sep 18:00 UTC = 1 Okt 01:00 WIB → sudah bulan Oktober.
    await getMonthTotals("user-budi", new Date("2026-09-30T18:00:00Z"));

    expect(mocks.groupBy).toHaveBeenCalledWith({
      by: ["type"],
      where: {
        userId: "user-budi",
        transactionDate: {
          gte: new Date("2026-10-01T00:00:00Z"),
          lte: new Date("2026-10-31T00:00:00Z"),
        },
      },
      _sum: { amount: true },
    });
  });
});

const USER = "user-budi";
const MAKAN = "0b5a3c1e-8f2d-4b7a-9c6e-1d2f3a4b5c6d";
const TRANSPORT = "1c6b4d2f-9a3e-4c8b-8d7f-2e3a4b5c6d7e";
const SEPT = { month: "2026-09", type: null, categoryIds: [] };

describe("buildTransactionListWhere (E02-US03)", () => {
  it("selalu ter-scope userId + rentang tanggal bulan (DATE)", () => {
    expect(buildTransactionListWhere(USER, SEPT)).toEqual({
      userId: USER,
      transactionDate: {
        gte: new Date("2026-09-01T00:00:00Z"),
        lte: new Date("2026-09-30T00:00:00Z"),
      },
    });
  });

  it("Februari tahun kabisat berakhir tanggal 29", () => {
    const where = buildTransactionListWhere(USER, {
      ...SEPT,
      month: "2028-02",
    });
    expect(where.transactionDate).toEqual({
      gte: new Date("2028-02-01T00:00:00Z"),
      lte: new Date("2028-02-29T00:00:00Z"),
    });
  });

  it("filter jenis & beberapa kategori", () => {
    expect(
      buildTransactionListWhere(USER, {
        month: "2026-08",
        type: "EXPENSE",
        categoryIds: [MAKAN, TRANSPORT],
      }),
    ).toEqual({
      userId: USER,
      transactionDate: {
        gte: new Date("2026-08-01T00:00:00Z"),
        lte: new Date("2026-08-31T00:00:00Z"),
      },
      type: "EXPENSE",
      categoryId: { in: [MAKAN, TRANSPORT] },
    });
  });
});

describe("buildCursorWhere", () => {
  it("setelah (tanggal, createdAt, id) pada urutan menurun", () => {
    const createdAt = "2026-09-30T05:15:00.123Z";
    expect(
      buildCursorWhere({ date: "2026-09-30", createdAt, id: MAKAN }),
    ).toEqual({
      OR: [
        { transactionDate: { lt: new Date("2026-09-30T00:00:00Z") } },
        {
          transactionDate: new Date("2026-09-30T00:00:00Z"),
          createdAt: { lt: new Date(createdAt) },
        },
        {
          transactionDate: new Date("2026-09-30T00:00:00Z"),
          createdAt: new Date(createdAt),
          id: { lt: MAKAN },
        },
      ],
    });
  });
});

describe("getTransactionListSummary (AC 5, 9)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("total pemasukan, pengeluaran, dan selisih dari seluruh data periode terfilter", async () => {
    mocks.groupBy.mockResolvedValue([
      { type: "EXPENSE", _sum: { amount: BigInt(393_000) } },
      { type: "INCOME", _sum: { amount: BigInt(8_000_000) } },
    ]);
    const filter = { ...SEPT, categoryIds: [MAKAN] };

    const summary = await getTransactionListSummary(USER, filter);

    expect(summary).toEqual({
      income: BigInt(8_000_000),
      expense: BigInt(393_000),
      net: BigInt(7_607_000),
    });
    expect(mocks.groupBy).toHaveBeenCalledWith({
      by: ["type"],
      where: buildTransactionListWhere(USER, filter),
      _sum: { amount: true },
    });
  });

  it("tanpa data → semua 0", async () => {
    mocks.groupBy.mockResolvedValue([]);
    expect(await getTransactionListSummary(USER, SEPT)).toEqual({
      income: BigInt(0),
      expense: BigInt(0),
      net: BigInt(0),
    });
  });
});

function row(i: number, date: string, type: "EXPENSE" | "INCOME" = "EXPENSE") {
  return {
    id: `00000000-0000-4000-8000-${String(1000 - i).padStart(12, "0")}`,
    type,
    amount: BigInt(10_000),
    transactionDate: new Date(`${date}T00:00:00Z`),
    note: i === 0 ? null : `Transaksi ${i}`,
    createdAt: new Date(Date.UTC(2026, 8, 30, 10, 0, 0) - i * 1000),
    category: {
      id: MAKAN,
      name: "Makan & Minum",
      icon: "utensils",
      archivedAt: i === 1 ? new Date() : null,
    },
  };
}

describe("getTransactionListPage (AC 9)", () => {
  beforeEach(() => vi.clearAllMocks());

  it(`mengambil ${TRANSACTION_PAGE_SIZE + 1} baris untuk tahu masih ada halaman berikutnya`, async () => {
    const rows = Array.from({ length: TRANSACTION_PAGE_SIZE + 1 }, (_, i) =>
      row(i, i < 30 ? "2026-09-30" : "2026-09-29"),
    );
    mocks.findMany.mockResolvedValue(rows);
    mocks.groupBy.mockResolvedValue([
      {
        transactionDate: new Date("2026-09-30T00:00:00Z"),
        type: "EXPENSE",
        _sum: { amount: BigInt(300_000) },
      },
      {
        transactionDate: new Date("2026-09-29T00:00:00Z"),
        type: "EXPENSE",
        _sum: { amount: BigInt(900_000) },
      },
      {
        transactionDate: new Date("2026-09-29T00:00:00Z"),
        type: "INCOME",
        _sum: { amount: BigInt(50_000) },
      },
    ]);

    const page = await getTransactionListPage(USER, SEPT);

    expect(mocks.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: buildTransactionListWhere(USER, SEPT),
        orderBy: [
          { transactionDate: "desc" },
          { createdAt: "desc" },
          { id: "desc" },
        ],
        take: TRANSACTION_PAGE_SIZE + 1,
      }),
    );
    expect(page.items).toHaveLength(TRANSACTION_PAGE_SIZE);
    expect(page.items[0]).toEqual({
      id: rows[0].id,
      type: "EXPENSE",
      amount: BigInt(10_000),
      date: "2026-09-30",
      note: null,
      createdAt: rows[0].createdAt.toISOString(),
      category: {
        id: MAKAN,
        name: "Makan & Minum",
        icon: "utensils",
        archived: false,
      },
    });
    expect(page.items[1].category.archived).toBe(true);
    const last = page.items[TRANSACTION_PAGE_SIZE - 1];
    expect(page.nextCursor).toEqual({
      date: last.date,
      createdAt: last.createdAt,
      id: last.id,
    });
    // Total harian dihitung untuk tanggal di halaman ini, dengan filter sama.
    expect(mocks.groupBy).toHaveBeenCalledWith({
      by: ["transactionDate", "type"],
      where: {
        ...buildTransactionListWhere(USER, SEPT),
        transactionDate: {
          in: [
            new Date("2026-09-30T00:00:00Z"),
            new Date("2026-09-29T00:00:00Z"),
          ],
        },
      },
      _sum: { amount: true },
    });
    expect(page.dayTotals).toEqual({
      "2026-09-30": { income: BigInt(0), expense: BigInt(300_000) },
      "2026-09-29": { income: BigInt(50_000), expense: BigInt(900_000) },
    });
  });

  it("halaman terakhir → nextCursor null; cursor digabung dengan filter", async () => {
    mocks.findMany.mockResolvedValue([row(0, "2026-09-01")]);
    mocks.groupBy.mockResolvedValue([]);
    const cursor = {
      date: "2026-09-02",
      createdAt: "2026-09-02T01:00:00.000Z",
      id: TRANSPORT,
    };

    const page = await getTransactionListPage(USER, SEPT, cursor);

    expect(mocks.findMany.mock.calls[0][0].where).toEqual({
      AND: [buildTransactionListWhere(USER, SEPT), buildCursorWhere(cursor)],
    });
    expect(page.nextCursor).toBeNull();
    expect(page.dayTotals["2026-09-01"]).toEqual({
      income: BigInt(0),
      expense: BigInt(0),
    });
  });

  it("tanpa transaksi → tidak menghitung total harian", async () => {
    mocks.findMany.mockResolvedValue([]);
    const page = await getTransactionListPage(USER, SEPT);
    expect(page).toEqual({ items: [], dayTotals: {}, nextCursor: null });
    expect(mocks.groupBy).not.toHaveBeenCalled();
  });
});

describe("getTransactionDetail", () => {
  beforeEach(() => vi.clearAllMocks());

  it("hanya mencari transaksi milik user", async () => {
    mocks.findFirst.mockResolvedValue(null);
    expect(await getTransactionDetail(USER, MAKAN)).toBeNull();
    expect(mocks.findFirst.mock.calls[0][0].where).toEqual({
      id: MAKAN,
      userId: USER,
    });
  });

  it("memetakan ke item daftar", async () => {
    const r = row(2, "2026-09-10");
    mocks.findFirst.mockResolvedValue(r);
    expect(await getTransactionDetail(USER, r.id)).toMatchObject({
      id: r.id,
      date: "2026-09-10",
      note: "Transaksi 2",
      category: { archived: false },
    });
  });
});
