import { describe, expect, it } from "vitest";

import {
  budgetAlertFor,
  budgetAlertMessage,
  budgetAttention,
  budgetAttentionLevel,
  budgetAttentionSummary,
} from "./alerts";

const B = BigInt(1_500_000);

function alert(before: number, after: number, budget = B) {
  return budgetAlertFor({
    categoryName: "Makan & Minum",
    budget,
    spentBefore: BigInt(before),
    spentAfter: BigInt(after),
  });
}

describe("budgetAlertFor — hanya bila status naik level", () => {
  it("Aman → Hampir habis", () => {
    expect(alert(1_100_000, 1_275_000)).toEqual({
      categoryName: "Makan & Minum",
      level: "warning",
      percent: 85,
      balanceLabel: "Sisa Rp 225.000",
    });
  });

  it("Hampir habis → Terlampaui", () => {
    expect(alert(1_300_000, 1_680_000)).toEqual({
      categoryName: "Makan & Minum",
      level: "over",
      percent: 112,
      balanceLabel: "Lebih Rp 180.000",
    });
  });

  it("Aman → Terlampaui langsung → hanya level Terlampaui", () => {
    expect(alert(500_000, 1_600_000)).toMatchObject({
      level: "over",
      balanceLabel: "Lebih Rp 100.000",
    });
  });

  it("nilai batas: 79,99% → 80% dan 99,99% → 100%", () => {
    const hundred = BigInt(100_000);
    expect(alert(79_999, 80_000, hundred)).toMatchObject({ level: "warning" });
    expect(alert(99_999, 100_000, hundred)).toMatchObject({
      level: "over",
      balanceLabel: "Sisa Rp 0",
    });
    expect(alert(0, 79_999, hundred)).toBeNull();
  });

  it.each([
    ["tetap Aman", 500_000, 600_000],
    ["tetap Hampir habis", 1_250_000, 1_300_000],
    ["sudah Terlampaui lalu bertambah", 1_600_000, 1_650_000],
    ["turun Terlampaui → Hampir habis", 1_600_000, 1_300_000],
    ["turun Hampir habis → Aman", 1_300_000, 100_000],
  ])("%s → null", (_, before, after) => {
    expect(alert(before, after)).toBeNull();
  });
});

describe("budgetAlertMessage", () => {
  it("kuning & merah sesuai contoh story", () => {
    expect(budgetAlertMessage(alert(1_100_000, 1_275_000)!)).toBe(
      "Anggaran Makan & Minum sudah terpakai 85%. Sisa Rp 225.000.",
    );
    expect(budgetAlertMessage(alert(1_300_000, 1_680_000)!)).toBe(
      "Anggaran Makan & Minum terlampaui. Lebih Rp 180.000.",
    );
  });
});

describe("budgetAttention (banner)", () => {
  const row = (name: string, spent: number, budget: number) => ({
    name,
    spent: BigInt(spent),
    budget: BigInt(budget),
  });

  it("tanpa kategori ≥ 80% → null", () => {
    expect(budgetAttention([])).toBeNull();
    expect(budgetAttention([row("Belanja", 79, 100)])).toBeNull();
  });

  it("kelompokkan per status, paling kritis dulu", () => {
    const attention = budgetAttention([
      row("Belanja", 85, 100),
      row("Makan & Minum", 1_600_000, 1_500_000),
      row("Transportasi", 500_000, 600_000),
      row("Hiburan", 200, 100),
      row("Kesehatan", 0, 100),
    ])!;
    expect(attention).toEqual({
      over: ["Hiburan", "Makan & Minum"],
      warning: ["Belanja", "Transportasi"],
    });
    expect(budgetAttentionLevel(attention)).toBe("over");
    expect(budgetAttentionSummary(attention)).toBe(
      "4 kategori perlu perhatian: 2 terlampaui, 2 hampir habis",
    );
  });

  it("hanya Hampir habis → kuning, tanpa bagian terlampaui", () => {
    const attention = budgetAttention([row("Makan & Minum", 85, 100)])!;
    expect(budgetAttentionLevel(attention)).toBe("warning");
    expect(budgetAttentionSummary(attention)).toBe(
      "1 kategori perlu perhatian: 1 hampir habis",
    );
  });
});
