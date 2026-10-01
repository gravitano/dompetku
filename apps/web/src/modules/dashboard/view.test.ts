import { describe, expect, it } from "vitest";

import type { RecentTransaction } from "~/modules/transactions/queries";

import { buildDashboardView, netState } from "./view";

const OKT = new Date("2026-10-01T00:00:00Z");

function trx(id: string): RecentTransaction {
  return {
    id,
    type: "EXPENSE",
    amount: BigInt(1000),
    transactionDate: OKT,
    note: null,
    category: { name: "Belanja", icon: null },
  };
}

const NO_BUDGET = {
  totalBudget: BigInt(0),
  totalSpent: BigInt(0),
  budgetCount: 0,
};

describe("netState", () => {
  it("positif, negatif, nol", () => {
    expect(netState(BigInt(1))).toBe("positive");
    expect(netState(BigInt(-1))).toBe("negative");
    expect(netState(BigInt(0))).toBe("zero");
  });
});

describe("buildDashboardView", () => {
  it("selisih = pemasukan − pengeluaran (contoh testing.md)", () => {
    const view = buildDashboardView({
      totals: {
        month: OKT,
        income: BigInt(8_000_000),
        expense: BigInt(943_000),
      },
      budget: NO_BUDGET,
      recent: [trx("a")],
    });
    expect(view.net).toBe(BigInt(7_057_000));
    expect(view.netState).toBe("positive");
    expect(view.isNewUser).toBe(false);
    expect(view.month).toBe(OKT);
  });

  it("selisih negatif", () => {
    const view = buildDashboardView({
      totals: {
        month: OKT,
        income: BigInt(1_000_000),
        expense: BigInt(1_500_000),
      },
      budget: NO_BUDGET,
      recent: [trx("a")],
    });
    expect(view.net).toBe(BigInt(-500_000));
    expect(view.netState).toBe("negative");
  });

  it("belum ada anggaran → budget null (ajakan Atur anggaran)", () => {
    const view = buildDashboardView({
      totals: { month: OKT, income: BigInt(0), expense: BigInt(500) },
      budget: { ...NO_BUDGET, totalSpent: BigInt(500) },
      recent: [trx("a")],
    });
    expect(view.budget).toBeNull();
  });

  it("ada anggaran → pemakaian total memakai aturan status E03-US02", () => {
    const view = buildDashboardView({
      totals: { month: OKT, income: BigInt(0), expense: BigInt(943_000) },
      budget: {
        totalBudget: BigInt(3_000_000),
        totalSpent: BigInt(943_000),
        budgetCount: 3,
      },
      recent: [trx("a")],
    });
    expect(view.budget).toMatchObject({
      spent: BigInt(943_000),
      budget: BigInt(3_000_000),
      percent: 31,
      status: "safe",
      remaining: BigInt(2_057_000),
    });
  });

  it("tepat 100% → Terlampaui, bar penuh", () => {
    const view = buildDashboardView({
      totals: { month: OKT, income: BigInt(0), expense: BigInt(100) },
      budget: {
        totalBudget: BigInt(100),
        totalSpent: BigInt(100),
        budgetCount: 1,
      },
      recent: [trx("a")],
    });
    expect(view.budget?.status).toBe("over");
    expect(view.budget?.barPercent).toBe(100);
  });

  it("pengguna baru tanpa transaksi → empty state, ringkasan Rp 0", () => {
    const view = buildDashboardView({
      totals: { month: OKT, income: BigInt(0), expense: BigInt(0) },
      budget: NO_BUDGET,
      recent: [],
    });
    expect(view.isNewUser).toBe(true);
    expect(view.net).toBe(BigInt(0));
    expect(view.netState).toBe("zero");
  });

  it("maksimal 5 transaksi terbaru", () => {
    const view = buildDashboardView({
      totals: { month: OKT, income: BigInt(0), expense: BigInt(0) },
      budget: NO_BUDGET,
      recent: ["a", "b", "c", "d", "e", "f"].map(trx),
    });
    expect(view.recent.map((t) => t.id)).toEqual(["a", "b", "c", "d", "e"]);
  });
});
