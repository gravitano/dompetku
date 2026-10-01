import { describe, expect, it } from "vitest";

import { buildBudgetRows, sumBudgets, type BudgetCategory } from "./view";

function category(
  id: string,
  name: string,
  extra: Partial<BudgetCategory> = {},
): BudgetCategory {
  return {
    id,
    name,
    type: "EXPENSE",
    icon: "package",
    isDefault: true,
    archivedAt: null,
    ...extra,
  };
}

const CATEGORIES: BudgetCategory[] = [
  category("lainnya", "Lainnya"),
  category("makan", "Makan & Minum"),
  category("transport", "Transportasi"),
  category("kopi", "Kopi", { isDefault: false }),
  category("hobi", "Hobi", { isDefault: false, archivedAt: new Date() }),
  category("game", "Game", { isDefault: false, archivedAt: new Date() }),
  category("gaji", "Gaji", { type: "INCOME" }),
];

describe("buildBudgetRows", () => {
  it("kategori pengeluaran aktif (urutan form) + nominal / Belum diatur", () => {
    const rows = buildBudgetRows(CATEGORIES, [
      { categoryId: "transport", amount: BigInt(600_000) },
    ]);
    expect(rows.map((r) => [r.slug, r.amount, r.archived])).toEqual([
      ["makan-minum", null, false],
      ["transportasi", BigInt(600_000), false],
      ["lainnya", null, false],
      ["kopi", null, false],
    ]);
  });

  it("kategori pemasukan tidak pernah tampil, terarsip hanya bila punya anggaran", () => {
    const rows = buildBudgetRows(CATEGORIES, [
      { categoryId: "hobi", amount: BigInt(200_000) },
      { categoryId: "gaji", amount: BigInt(1) },
    ]);
    expect(rows.map((r) => r.slug)).not.toContain("gaji");
    expect(rows.map((r) => r.slug)).not.toContain("game");
    expect(rows.at(-1)).toMatchObject({
      slug: "hobi",
      archived: true,
      amount: BigInt(200_000),
    });
  });

  it("slug bentrok diberi nomor urut", () => {
    const rows = buildBudgetRows(
      [
        category("a", "Makan Minum", { isDefault: false }),
        category("b", "Makan & Minum"),
      ],
      [],
    );
    expect(rows.map((r) => r.slug)).toEqual(["makan-minum", "makan-minum-2"]);
  });
});

describe("sumBudgets", () => {
  it("menjumlah semua nominal (BigInt)", () => {
    expect(sumBudgets([])).toBe(BigInt(0));
    expect(
      sumBudgets([
        { amount: BigInt(1_500_000) },
        { amount: BigInt(1_400_000) },
      ]),
    ).toBe(BigInt(2_900_000));
  });
});
