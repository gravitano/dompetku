import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  categoryFindMany: vi.fn(),
  transactionGroupBy: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("~/lib/prisma", () => ({
  prisma: {
    category: { findMany: mocks.categoryFindMany },
    transaction: { groupBy: mocks.transactionGroupBy },
  },
}));

const { getExpenseCategoryReport, getMonthCategoryExpenses } =
  await import("./queries");

const MAKAN = "11111111-1111-4111-8111-111111111111";
const HIBURAN = "22222222-2222-4222-8222-222222222222";

beforeEach(() => vi.clearAllMocks());

describe("getMonthCategoryExpenses", () => {
  it("pengeluaran bulan itu milik user session + kategori (termasuk terarsip)", async () => {
    mocks.transactionGroupBy.mockResolvedValue([
      { categoryId: MAKAN, _sum: { amount: BigInt(1_000_000) } },
      { categoryId: HIBURAN, _sum: { amount: BigInt(200_000) } },
    ]);
    mocks.categoryFindMany.mockResolvedValue([
      { id: MAKAN, name: "Makan & Minum", icon: "utensils", archivedAt: null },
      {
        id: HIBURAN,
        name: "Hiburan",
        icon: "clapperboard",
        archivedAt: new Date("2026-09-20T00:00:00Z"),
      },
    ]);

    const result = await getMonthCategoryExpenses("user-budi", "2026-09");

    expect(mocks.transactionGroupBy).toHaveBeenCalledWith({
      by: ["categoryId"],
      where: {
        userId: "user-budi",
        type: "EXPENSE",
        transactionDate: {
          gte: new Date("2026-09-01T00:00:00Z"),
          lte: new Date("2026-09-30T00:00:00Z"),
        },
      },
      _sum: { amount: true },
    });
    expect(mocks.categoryFindMany).toHaveBeenCalledWith({
      where: { userId: "user-budi", id: { in: [MAKAN, HIBURAN] } },
      select: { id: true, name: true, icon: true, archivedAt: true },
    });
    expect(result).toEqual([
      {
        categoryId: MAKAN,
        name: "Makan & Minum",
        icon: "utensils",
        archived: false,
        amount: BigInt(1_000_000),
      },
      {
        categoryId: HIBURAN,
        name: "Hiburan",
        icon: "clapperboard",
        archived: true,
        amount: BigInt(200_000),
      },
    ]);
  });

  it("bulan tanpa pengeluaran → tanpa query kategori", async () => {
    mocks.transactionGroupBy.mockResolvedValue([]);
    expect(await getMonthCategoryExpenses("user-ani", "2026-08")).toEqual([]);
    expect(mocks.categoryFindMany).not.toHaveBeenCalled();
  });
});

describe("getExpenseCategoryReport", () => {
  it("menghasilkan laporan tanpa BigInt (aman dikirim ke client)", async () => {
    mocks.transactionGroupBy.mockResolvedValue([
      { categoryId: MAKAN, _sum: { amount: BigInt(25_000) } },
    ]);
    mocks.categoryFindMany.mockResolvedValue([
      { id: MAKAN, name: "Makan & Minum", icon: "utensils", archivedAt: null },
    ]);
    const report = await getExpenseCategoryReport(
      "user-budi",
      "2026-10",
      "2026-10",
    );
    expect(report.total).toBe("25000");
    expect(report.items[0]).toMatchObject({
      name: "Makan & Minum",
      percentTenths: 1000,
      href: `/transactions?category=${MAKAN}`,
    });
    expect(() => JSON.stringify(report)).not.toThrow();
  });
});
