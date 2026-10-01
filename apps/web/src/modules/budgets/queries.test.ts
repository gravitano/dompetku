import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  categoryFindMany: vi.fn(),
  budgetFindMany: vi.fn(),
  budgetCount: vi.fn(),
  budgetAggregate: vi.fn(),
  transactionAggregate: vi.fn(),
  transactionGroupBy: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("~/lib/prisma", () => ({
  prisma: {
    category: { findMany: mocks.categoryFindMany },
    budget: {
      findMany: mocks.budgetFindMany,
      count: mocks.budgetCount,
      aggregate: mocks.budgetAggregate,
    },
    transaction: {
      aggregate: mocks.transactionAggregate,
      groupBy: mocks.transactionGroupBy,
    },
  },
}));

const {
  getBudgetMonth,
  getBudgetSummary,
  getMonthBudgets,
  getMonthExpenseByCategory,
} = await import("./queries");

const OKT = new Date("2026-10-01T00:00:00Z");

beforeEach(() => vi.clearAllMocks());

describe("getBudgetMonth", () => {
  it("baris, total, dan jumlah anggaran bulan lalu yang bisa disalin", async () => {
    mocks.categoryFindMany.mockResolvedValue([
      {
        id: "makan",
        name: "Makan & Minum",
        type: "EXPENSE",
        icon: "utensils",
        isDefault: true,
        archivedAt: null,
      },
      {
        id: "hobi",
        name: "Hobi",
        type: "EXPENSE",
        icon: "package",
        isDefault: false,
        archivedAt: new Date(),
      },
    ]);
    mocks.budgetFindMany.mockResolvedValue([
      { categoryId: "makan", amount: BigInt(1_500_000) },
      { categoryId: "hobi", amount: BigInt(200_000) },
    ]);
    mocks.budgetCount.mockResolvedValue(3);
    mocks.transactionGroupBy.mockResolvedValue([
      { categoryId: "makan", _sum: { amount: BigInt(1_680_000) } },
      { categoryId: "lain-terarsip", _sum: { amount: BigInt(20_000) } },
    ]);

    const view = await getBudgetMonth("user-budi", "2026-10");

    expect(view).toMatchObject({
      month: "2026-10",
      total: BigInt(1_700_000),
      // Seluruh pengeluaran bulan tsb, termasuk kategori tanpa anggaran.
      totalSpent: BigInt(1_700_000),
      budgetCount: 2,
      copyableFromPrevious: 3,
    });
    expect(view.rows.map((r) => [r.slug, r.archived, r.spent])).toEqual([
      ["makan-minum", false, BigInt(1_680_000)],
      ["hobi", true, BigInt(0)],
    ]);
    expect(view.sections.budgeted.map((r) => [r.slug, r.usage.status])).toEqual(
      [
        ["makan-minum", "over"],
        ["hobi", "safe"],
      ],
    );
    expect(mocks.transactionGroupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: "user-budi",
          type: "EXPENSE",
        }),
      }),
    );
    expect(mocks.categoryFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "user-budi", type: "EXPENSE" },
      }),
    );
    expect(mocks.budgetFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "user-budi", periodMonth: OKT },
      }),
    );
    // Salin: hanya bulan lalu, kategori pengeluaran aktif milik user.
    expect(mocks.budgetCount).toHaveBeenCalledWith({
      where: {
        userId: "user-budi",
        periodMonth: new Date("2026-09-01T00:00:00Z"),
        category: { userId: "user-budi", type: "EXPENSE", archivedAt: null },
      },
    });
  });
});

describe("getMonthBudgets / getMonthExpenseByCategory", () => {
  it("scope userId + bulan", async () => {
    mocks.budgetFindMany.mockResolvedValue([]);
    await getMonthBudgets("user-ani", "2027-01");
    expect(mocks.budgetFindMany).toHaveBeenCalledWith({
      where: {
        userId: "user-ani",
        periodMonth: new Date("2027-01-01T00:00:00Z"),
      },
      select: { categoryId: true, amount: true },
    });
  });

  it("pengeluaran per kategori bulan tsb (semua kategori)", async () => {
    mocks.transactionGroupBy.mockResolvedValue([
      { categoryId: "makan", _sum: { amount: BigInt(25_000) } },
      { categoryId: "lain", _sum: { amount: null } },
    ]);
    const result = await getMonthExpenseByCategory("user-budi", "2026-10");
    expect(result).toEqual(
      new Map([
        ["makan", BigInt(25_000)],
        ["lain", BigInt(0)],
      ]),
    );
    expect(mocks.transactionGroupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId: "user-budi",
          type: "EXPENSE",
          transactionDate: {
            gte: OKT,
            lte: new Date("2026-10-31T00:00:00Z"),
          },
        },
      }),
    );
  });
});

describe("getBudgetSummary", () => {
  it("total anggaran vs SELURUH pengeluaran bulan tsb (termasuk tanpa anggaran)", async () => {
    mocks.budgetAggregate.mockResolvedValue({
      _sum: { amount: BigInt(3_000_000) },
      _count: { _all: 4 },
    });
    mocks.transactionAggregate.mockResolvedValue({
      _sum: { amount: BigInt(1_250_000) },
    });

    expect(await getBudgetSummary("user-budi", "2026-10")).toEqual({
      totalBudget: BigInt(3_000_000),
      totalSpent: BigInt(1_250_000),
      budgetCount: 4,
    });
    expect(mocks.transactionAggregate).toHaveBeenCalledWith({
      where: {
        userId: "user-budi",
        type: "EXPENSE",
        transactionDate: { gte: OKT, lte: new Date("2026-10-31T00:00:00Z") },
      },
      _sum: { amount: true },
    });
  });

  it("belum ada anggaran & transaksi → nol", async () => {
    mocks.budgetAggregate.mockResolvedValue({
      _sum: { amount: null },
      _count: { _all: 0 },
    });
    mocks.transactionAggregate.mockResolvedValue({ _sum: { amount: null } });
    expect(await getBudgetSummary("user-baru", "2026-10")).toEqual({
      totalBudget: BigInt(0),
      totalSpent: BigInt(0),
      budgetCount: 0,
    });
  });
});
