import { describe, expect, it } from "vitest";

import {
  averageExpense,
  buildTrendReport,
  trendMonthKeys,
  type MonthlyTotal,
} from "./trend";

function row(
  month: string,
  type: MonthlyTotal["type"],
  amount: number,
): MonthlyTotal {
  return { month, type, amount: BigInt(amount) };
}

/** Background testing.md (April–Oktober 2026). */
const BUDI_TOTALS: MonthlyTotal[] = [
  row("2026-04", "INCOME", 8_000_000),
  row("2026-04", "EXPENSE", 5_000_000),
  row("2026-05", "INCOME", 8_000_000),
  row("2026-05", "EXPENSE", 1_000_000),
  row("2026-06", "INCOME", 8_000_000),
  row("2026-06", "EXPENSE", 2_000_000),
  row("2026-08", "INCOME", 8_000_000),
  row("2026-08", "EXPENSE", 1_500_000),
  row("2026-09", "INCOME", 8_000_000),
  row("2026-09", "EXPENSE", 3_000_000),
  row("2026-10", "INCOME", 8_000_000),
  row("2026-10", "EXPENSE", 1_500_000),
];

describe("trendMonthKeys", () => {
  it("6 bulan terakhir termasuk bulan berjalan, terlama dulu", () => {
    expect(trendMonthKeys("2026-10")).toEqual([
      "2026-05",
      "2026-06",
      "2026-07",
      "2026-08",
      "2026-09",
      "2026-10",
    ]);
  });

  it("lintas tahun (Februari → September tahun lalu, Januari → Agustus)", () => {
    expect(trendMonthKeys("2027-02")).toEqual([
      "2026-09",
      "2026-10",
      "2026-11",
      "2026-12",
      "2027-01",
      "2027-02",
    ]);
    expect(trendMonthKeys("2027-01")[0]).toBe("2026-08");
  });
});

describe("averageExpense", () => {
  it("total ÷ jumlah bulan (termasuk bulan bernilai 0)", () => {
    expect(averageExpense([0, 0, 0, 0, 0, 600_000].map((n) => BigInt(n)))).toBe(
      BigInt(100_000),
    );
  });

  it("dibulatkan half-up ke Rupiah penuh", () => {
    // 10 / 6 = 1,67 → 2; 9 / 6 = 1,5 → 2; 8 / 6 = 1,33 → 1.
    expect(averageExpense([BigInt(10), ...Array(5).fill(BigInt(0))])).toBe(
      BigInt(2),
    );
    expect(averageExpense([BigInt(9), ...Array(5).fill(BigInt(0))])).toBe(
      BigInt(2),
    );
    expect(averageExpense([BigInt(8), ...Array(5).fill(BigInt(0))])).toBe(
      BigInt(1),
    );
  });

  it("tanpa bulan → 0", () => {
    expect(averageExpense([])).toBe(BigInt(0));
  });
});

describe("buildTrendReport", () => {
  it("Background testing.md: Mei–Okt, April diabaikan, Juli = 0, rata-rata 1.500.000", () => {
    const report = buildTrendReport("2026-10", BUDI_TOTALS);

    expect(report.months.map((month) => month.month)).toEqual([
      "2026-05",
      "2026-06",
      "2026-07",
      "2026-08",
      "2026-09",
      "2026-10",
    ]);
    expect(report.months.map((month) => month.shortLabel)).toEqual([
      "Mei",
      "Jun",
      "Jul",
      "Agu",
      "Sep",
      "Okt",
    ]);
    expect(report.months[4]).toEqual({
      month: "2026-09",
      shortLabel: "Sep",
      label: "September 2026",
      income: "8000000",
      expense: "3000000",
      hasData: true,
    });
    expect(report.months[2]).toMatchObject({
      month: "2026-07",
      label: "Juli 2026",
      income: "0",
      expense: "0",
      hasData: false,
    });
    expect(report.averageExpense).toBe("1500000");
    expect(report.monthsWithData).toBe(5);
    expect(report.insufficientData).toBe(false);
  });

  it("data hanya di 1 bulan → data kurang, grafik tetap 6 bulan bernilai 0", () => {
    const report = buildTrendReport("2026-10", [
      row("2026-10", "EXPENSE", 600_000),
    ]);
    expect(report.months).toHaveLength(6);
    expect(
      report.months.slice(0, 5).every((m) => m.income === "0" && !m.hasData),
    ).toBe(true);
    expect(report.months[5]).toMatchObject({ expense: "600000", income: "0" });
    expect(report.monthsWithData).toBe(1);
    expect(report.insufficientData).toBe(true);
    expect(report.averageExpense).toBe("100000");
  });

  it("tanpa transaksi → semua 0, data kurang, rata-rata 0", () => {
    const report = buildTrendReport("2026-10", []);
    expect(report.months.every((m) => m.expense === "0")).toBe(true);
    expect(report.monthsWithData).toBe(0);
    expect(report.insufficientData).toBe(true);
    expect(report.averageExpense).toBe("0");
  });

  it("tepat 2 bulan berdata (pemasukan saja juga dihitung) → cukup", () => {
    const report = buildTrendReport("2026-10", [
      row("2026-09", "INCOME", 1_000),
      row("2026-10", "EXPENSE", 2_000),
    ]);
    expect(report.monthsWithData).toBe(2);
    expect(report.insufficientData).toBe(false);
  });

  it("data hanya di luar jendela (bulan ke-7) → tidak dihitung", () => {
    const report = buildTrendReport("2026-10", [
      row("2026-04", "EXPENSE", 5_000_000),
      row("2026-11", "EXPENSE", 1_000),
    ]);
    expect(report.monthsWithData).toBe(0);
    expect(report.averageExpense).toBe("0");
  });

  it("lintas tahun: Desember & Januari terisi di jendela yang benar", () => {
    const report = buildTrendReport("2027-01", [
      row("2026-12", "INCOME", 7_000_000),
      row("2026-12", "EXPENSE", 2_000_000),
      row("2027-01", "EXPENSE", 1_000_000),
      row("2026-07", "EXPENSE", 9_000_000),
    ]);
    expect(report.months.map((m) => m.shortLabel)).toEqual([
      "Agu",
      "Sep",
      "Okt",
      "Nov",
      "Des",
      "Jan",
    ]);
    expect(report.months[4]).toMatchObject({
      label: "Desember 2026",
      income: "7000000",
      expense: "2000000",
    });
    expect(report.months[5]).toMatchObject({
      label: "Januari 2027",
      expense: "1000000",
    });
    expect(report.averageExpense).toBe("500000");
  });

  it("baris duplikat bulan + tipe dijumlahkan; nominal besar tetap presisi", () => {
    const report = buildTrendReport("2026-10", [
      row("2026-10", "EXPENSE", 1_000),
      { month: "2026-10", type: "EXPENSE", amount: BigInt("9007199254740993") },
    ]);
    expect(report.months[5].expense).toBe("9007199254741993");
  });
});
