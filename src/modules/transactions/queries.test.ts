import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ groupBy: vi.fn() }));

vi.mock("server-only", () => ({}));
vi.mock("~/lib/prisma", () => ({
  prisma: { transaction: { groupBy: mocks.groupBy } },
}));

const { getMonthTotals } = await import("./queries");

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
