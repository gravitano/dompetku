import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getMonthTotals: vi.fn(),
  getRecentTransactions: vi.fn(),
  getBudgetSummary: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("~/modules/transactions/queries", () => ({
  getMonthTotals: mocks.getMonthTotals,
  getRecentTransactions: mocks.getRecentTransactions,
}));
vi.mock("~/modules/budgets/queries", () => ({
  getBudgetSummary: mocks.getBudgetSummary,
}));

const { getDashboardData } = await import("./queries");

const ZERO = BigInt(0);

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "info").mockImplementation(() => {});
  mocks.getMonthTotals.mockResolvedValue({
    month: new Date("2027-01-01T00:00:00Z"),
    income: ZERO,
    expense: ZERO,
  });
  mocks.getRecentTransactions.mockResolvedValue([]);
  mocks.getBudgetSummary.mockResolvedValue({
    totalBudget: ZERO,
    totalSpent: ZERO,
    budgetCount: 0,
  });
});

describe("getDashboardData", () => {
  it("memakai userId & bulan berjalan Asia/Jakarta yang sama untuk semua query", async () => {
    // 31 Des 2026 17:30 UTC = 1 Jan 2027 00:30 WIB.
    const now = new Date("2026-12-31T17:30:00Z");
    await getDashboardData("user-1", now);
    expect(mocks.getMonthTotals).toHaveBeenCalledWith("user-1", now);
    expect(mocks.getRecentTransactions).toHaveBeenCalledWith("user-1", 5);
    expect(mocks.getBudgetSummary).toHaveBeenCalledWith("user-1", "2027-01");
  });

  it("query dijalankan paralel (tidak saling menunggu)", async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    mocks.getMonthTotals.mockImplementation(async () => {
      await gate;
      return { month: new Date(), income: ZERO, expense: ZERO };
    });
    const pending = getDashboardData("user-1");
    await Promise.resolve();
    expect(mocks.getRecentTransactions).toHaveBeenCalled();
    expect(mocks.getBudgetSummary).toHaveBeenCalled();
    release();
    await pending;
  });

  it("mencatat waktu muat ke log server", async () => {
    await getDashboardData("user-1");
    expect(console.info).toHaveBeenCalledWith(
      expect.stringMatching(/^\[beranda\] data dimuat dalam \d+ ms$/),
    );
  });
});
