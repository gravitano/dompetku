import { describe, expect, it } from "vitest";

import {
  BUDGET_STATUS_COLOR,
  BUDGET_STATUS_LABEL,
  budgetBalanceLabel,
  budgetPercent,
  budgetStatus,
  budgetUsage,
  compareBudgetUsage,
  isBudgetStatusRaised,
} from "./status";

const n = (value: number) => BigInt(value);

describe("budgetStatus / budgetPercent — nilai batas", () => {
  it.each([
    // [terpakai, anggaran, persen tampilan, status]
    [0, 100_000, 0, "safe"],
    [79_999, 100_000, 79, "safe"], // 79,999%
    [79_990, 100_000, 79, "safe"], // 79,99%
    [79_600, 100_000, 79, "safe"], // 79,6% → 79%, tetap hijau
    [80_000, 100_000, 80, "warning"], // tepat 80%
    [99_990, 100_000, 99, "warning"], // 99,99%
    [99_999, 100_000, 99, "warning"],
    [100_000, 100_000, 100, "over"], // tepat 100%
    [112_000, 100_000, 112, "over"],
    [1_680_000, 1_500_000, 112, "over"],
  ] as const)(
    "terpakai %i dari %i → %i%% %s",
    (spent, budget, percent, status) => {
      expect(budgetPercent(n(spent), n(budget))).toBe(percent);
      expect(budgetStatus(n(spent), n(budget))).toBe(status);
    },
  );

  it("nilai sebenarnya, bukan persen yang dibulatkan", () => {
    // 7.999.999 dari 10.000.000 = 79,99999% → tetap Aman.
    expect(budgetStatus(n(7_999_999), n(10_000_000))).toBe("safe");
    expect(budgetStatus(n(8_000_000), n(10_000_000))).toBe("warning");
    expect(budgetStatus(n(999_999_999), n(1_000_000_000))).toBe("warning");
    expect(budgetPercent(n(999_999_999), n(1_000_000_000))).toBe(99);
  });

  it("anggaran sangat kecil (Rp 1)", () => {
    expect(budgetStatus(n(0), n(1))).toBe("safe");
    expect(budgetPercent(n(0), n(1))).toBe(0);
    expect(budgetStatus(n(1), n(1))).toBe("over");
    expect(budgetPercent(n(1), n(1))).toBe(100);
    expect(budgetPercent(n(250_000), n(1))).toBe(25_000_000);
  });

  it("anggaran 0 (tanpa anggaran): 0% Aman, ada pengeluaran → 100% Terlampaui", () => {
    expect(budgetStatus(n(0), n(0))).toBe("safe");
    expect(budgetPercent(n(0), n(0))).toBe(0);
    expect(budgetStatus(n(1), n(0))).toBe("over");
    expect(budgetPercent(n(1), n(0))).toBe(100);
  });

  it("pengeluaran sangat kecil terhadap anggaran besar → 0%", () => {
    expect(budgetPercent(n(1), n(1_000_000_000))).toBe(0);
    expect(budgetStatus(n(1), n(1_000_000_000))).toBe("safe");
  });

  it("nominal besar (jumlah banyak anggaran) tetap presisi", () => {
    const budget = n(1_000_000_000) * n(1_000);
    expect(budgetPercent(budget - n(1), budget)).toBe(99);
    expect(budgetStatus(budget - n(1), budget)).toBe("warning");
  });
});

describe("budgetUsage / budgetBalanceLabel", () => {
  it.each([
    [400_000, 1_000_000, "Sisa Rp 600.000", 40],
    [79_999, 100_000, "Sisa Rp 20.001", 79],
    [80_000, 100_000, "Sisa Rp 20.000", 80],
    [99_999, 100_000, "Sisa Rp 1", 99],
    [100_000, 100_000, "Sisa Rp 0", 100],
    [112_000, 100_000, "Lebih Rp 12.000", 100],
    [0, 1_500_000, "Sisa Rp 1.500.000", 0],
  ] as const)("%i / %i → %s (bar %i%%)", (spent, budget, label, bar) => {
    const usage = budgetUsage(n(spent), n(budget));
    expect(budgetBalanceLabel(usage)).toBe(label);
    expect(usage.barPercent).toBe(bar);
  });

  it("sisa & kelebihan tidak pernah negatif", () => {
    expect(budgetUsage(n(1_260_000), n(1_200_000))).toMatchObject({
      remaining: n(0),
      overBy: n(60_000),
      percent: 105,
      status: "over",
    });
    expect(budgetUsage(n(3_420_000), n(4_500_000))).toMatchObject({
      remaining: n(1_080_000),
      overBy: n(0),
      percent: 76,
      status: "safe",
    });
  });
});

describe("compareBudgetUsage", () => {
  const row = (spent: number, budget: number) => ({
    spent: n(spent),
    budget: n(budget),
  });

  it("rasio sebenarnya tertinggi dulu", () => {
    const rows = [
      row(400_000, 1_000_000), // 40%
      row(1_680_000, 1_500_000), // 112%
      row(580_000, 1_400_000), // 41,4%
      row(510_000, 600_000), // 85%
    ];
    expect(rows.sort(compareBudgetUsage).map((r) => r.spent)).toEqual([
      n(1_680_000),
      n(510_000),
      n(580_000),
      n(400_000),
    ]);
  });

  it("persen tampilan sama tetapi nilai sebenarnya beda → yang lebih besar dulu", () => {
    expect(compareBudgetUsage(row(79_100, 100_000), row(799, 1_000))).toBe(1);
    expect(compareBudgetUsage(row(799, 1_000), row(79_100, 100_000))).toBe(-1);
  });

  it("rasio sama → 0 (urutan stabil)", () => {
    expect(compareBudgetUsage(row(50, 100), row(500, 1_000))).toBe(0);
    expect(compareBudgetUsage(row(0, 100), row(0, 1))).toBe(0);
  });

  it("anggaran 0 dengan pengeluaran paling kritis", () => {
    expect(compareBudgetUsage(row(1, 0), row(500, 100))).toBe(-1);
    expect(compareBudgetUsage(row(500, 100), row(1, 0))).toBe(1);
  });
});

describe("isBudgetStatusRaised", () => {
  it("hanya naik level yang dihitung", () => {
    expect(isBudgetStatusRaised("safe", "warning")).toBe(true);
    expect(isBudgetStatusRaised("safe", "over")).toBe(true);
    expect(isBudgetStatusRaised("warning", "over")).toBe(true);
    expect(isBudgetStatusRaised("warning", "warning")).toBe(false);
    expect(isBudgetStatusRaised("over", "over")).toBe(false);
    expect(isBudgetStatusRaised("over", "warning")).toBe(false);
    expect(isBudgetStatusRaised("warning", "safe")).toBe(false);
  });
});

describe("label & warna", () => {
  it("sesuai story", () => {
    expect(BUDGET_STATUS_COLOR).toEqual({
      safe: "green",
      warning: "yellow",
      over: "red",
    });
    expect(BUDGET_STATUS_LABEL).toEqual({
      safe: "Aman",
      warning: "Hampir habis",
      over: "Terlampaui",
    });
  });
});
