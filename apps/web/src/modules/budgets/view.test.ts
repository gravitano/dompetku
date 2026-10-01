import { describe, expect, it } from "vitest";

import {
  buildBudgetRows,
  groupBudgetRows,
  sumBudgets,
  sumSpent,
  type BudgetCategory,
} from "./view";

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

describe("buildBudgetRows — pengeluaran (E03-US02)", () => {
  it("pengeluaran per baris; kategori terarsip ikut tampil bila ada pengeluaran", () => {
    const rows = buildBudgetRows(
      CATEGORIES,
      [{ categoryId: "makan", amount: BigInt(1_500_000) }],
      new Map([
        ["makan", BigInt(1_680_000)],
        ["game", BigInt(50_000)],
        ["gaji", BigInt(9_000_000)],
      ]),
    );
    expect(rows.map((r) => [r.slug, r.spent, r.archived])).toEqual([
      ["makan-minum", BigInt(1_680_000), false],
      ["transportasi", BigInt(0), false],
      ["lainnya", BigInt(0), false],
      ["kopi", BigInt(0), false],
      ["game", BigInt(50_000), true],
    ]);
  });
});

describe("groupBudgetRows", () => {
  const rows = buildBudgetRows(
    [
      category("makan", "Makan & Minum"),
      category("transport", "Transportasi"),
      category("belanja", "Belanja"),
      category("tagihan", "Tagihan"),
      category("hiburan", "Hiburan"),
      category("kesehatan", "Kesehatan"),
      category("lainnya", "Lainnya"),
      category("hobi", "Hobi", { isDefault: false, archivedAt: new Date() }),
    ],
    [
      { categoryId: "belanja", amount: BigInt(1_000_000) },
      { categoryId: "makan", amount: BigInt(1_500_000) },
      { categoryId: "transport", amount: BigInt(600_000) },
      { categoryId: "tagihan", amount: BigInt(1_400_000) },
    ],
    new Map([
      ["makan", BigInt(1_680_000)],
      ["transport", BigInt(510_000)],
      ["belanja", BigInt(400_000)],
      ["tagihan", BigInt(580_000)],
      ["hiburan", BigInt(250_000)],
      ["hobi", BigInt(300_000)],
    ]),
  );

  it("beranggaran urut persentase tertinggi + status & sisa", () => {
    const { budgeted } = groupBudgetRows(rows);
    expect(
      budgeted.map((r) => [r.slug, r.usage.percent, r.usage.status]),
    ).toEqual([
      ["makan-minum", 112, "over"],
      ["transportasi", 85, "warning"],
      ["tagihan", 41, "safe"],
      ["belanja", 40, "safe"],
    ]);
    expect(budgeted[0].usage.overBy).toBe(BigInt(180_000));
    expect(budgeted[3].usage.remaining).toBe(BigInt(600_000));
  });

  it("tanpa anggaran (nominal terbesar dulu, termasuk terarsip) & belum diatur", () => {
    const { unbudgeted, notSet } = groupBudgetRows(rows);
    expect(unbudgeted.map((r) => [r.slug, r.spent, r.archived])).toEqual([
      ["hobi", BigInt(300_000), true],
      ["hiburan", BigInt(250_000), false],
    ]);
    expect(notSet.map((r) => r.slug)).toEqual(["kesehatan", "lainnya"]);
  });

  it("persentase sama → urutan asal (stabil); tanpa pengeluaran semua 0% Aman", () => {
    const { budgeted } = groupBudgetRows(
      buildBudgetRows(
        [category("makan", "Makan & Minum"), category("lainnya", "Lainnya")],
        [
          { categoryId: "lainnya", amount: BigInt(100_000) },
          { categoryId: "makan", amount: BigInt(1_500_000) },
        ],
      ),
    );
    expect(
      budgeted.map((r) => [r.slug, r.usage.percent, r.usage.status]),
    ).toEqual([
      ["makan-minum", 0, "safe"],
      ["lainnya", 0, "safe"],
    ]);
  });
});

describe("sumSpent", () => {
  it("menjumlah seluruh pengeluaran per kategori", () => {
    expect(sumSpent(new Map())).toBe(BigInt(0));
    expect(
      sumSpent(
        new Map([
          ["a", BigInt(1_680_000)],
          ["b", BigInt(250_000)],
        ]),
      ),
    ).toBe(BigInt(1_930_000));
  });
});
