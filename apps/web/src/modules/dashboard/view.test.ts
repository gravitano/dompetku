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

function totals(
  income: number,
  expense: number,
  byCategory: Record<string, number> = {},
) {
  return {
    month: OKT,
    income: BigInt(income),
    expense: BigInt(expense),
    expenseByCategory: new Map(
      Object.entries(byCategory).map(([id, v]) => [id, BigInt(v)]),
    ),
  };
}

function budgetItem(categoryId: string, name: string, amount: number) {
  return { categoryId, name, amount: BigInt(amount) };
}

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
      totals: totals(8_000_000, 943_000),
      budgets: [],
      recent: [trx("a")],
    });
    expect(view.net).toBe(BigInt(7_057_000));
    expect(view.netState).toBe("positive");
    expect(view.isNewUser).toBe(false);
    expect(view.month).toBe(OKT);
  });

  it("selisih negatif", () => {
    const view = buildDashboardView({
      totals: totals(1_000_000, 1_500_000),
      budgets: [],
      recent: [trx("a")],
    });
    expect(view.net).toBe(BigInt(-500_000));
    expect(view.netState).toBe("negative");
  });

  it("belum ada anggaran → budget & attention null (ajakan Atur anggaran)", () => {
    const view = buildDashboardView({
      totals: totals(0, 500, { makan: 500 }),
      budgets: [],
      recent: [trx("a")],
    });
    expect(view.budget).toBeNull();
    expect(view.attention).toBeNull();
  });

  it("ada anggaran → total anggaran vs SELURUH pengeluaran bulan (aturan E03-US02)", () => {
    const view = buildDashboardView({
      // 43.000 dari kategori tanpa anggaran tetap dihitung.
      totals: totals(0, 943_000, { makan: 900_000, hiburan: 43_000 }),
      budgets: [
        budgetItem("makan", "Makan & Minum", 1_500_000),
        budgetItem("transport", "Transportasi", 1_000_000),
        budgetItem("belanja", "Belanja", 500_000),
      ],
      recent: [trx("a")],
    });
    expect(view.budget).toMatchObject({
      spent: BigInt(943_000),
      budget: BigInt(3_000_000),
      percent: 31,
      status: "safe",
      remaining: BigInt(2_057_000),
    });
    expect(view.attention).toBeNull();
  });

  it("tepat 100% → Terlampaui, bar penuh", () => {
    const view = buildDashboardView({
      totals: totals(0, 100, { makan: 100 }),
      budgets: [budgetItem("makan", "Makan & Minum", 100)],
      recent: [trx("a")],
    });
    expect(view.budget?.status).toBe("over");
    expect(view.budget?.barPercent).toBe(100);
  });

  it("banner: kategori Hampir habis / Terlampaui dari pengeluaran per kategori (E03-US03)", () => {
    const view = buildDashboardView({
      totals: totals(0, 2_380_000, {
        makan: 1_600_000,
        transport: 500_000,
        belanja: 100_000,
        hiburan: 180_000,
      }),
      budgets: [
        budgetItem("makan", "Makan & Minum", 1_500_000),
        budgetItem("transport", "Transportasi", 600_000),
        budgetItem("belanja", "Belanja", 1_000_000),
        budgetItem("kosong", "Kesehatan", 200_000),
      ],
      recent: [trx("a")],
    });
    expect(view.attention).toEqual({
      over: ["Makan & Minum"],
      warning: ["Transportasi"],
    });
  });

  it("pengguna baru tanpa transaksi → empty state, ringkasan Rp 0", () => {
    const view = buildDashboardView({
      totals: totals(0, 0),
      budgets: [],
      recent: [],
    });
    expect(view.isNewUser).toBe(true);
    expect(view.net).toBe(BigInt(0));
    expect(view.netState).toBe("zero");
  });

  it("maksimal 5 transaksi terbaru", () => {
    const view = buildDashboardView({
      totals: totals(0, 0),
      budgets: [],
      recent: ["a", "b", "c", "d", "e", "f"].map(trx),
    });
    expect(view.recent.map((t) => t.id)).toEqual(["a", "b", "c", "d", "e"]);
  });
});
