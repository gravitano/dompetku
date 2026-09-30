import { describe, expect, it } from "vitest";

import { DEFAULT_EXPENSE_CATEGORIES } from "./defaults";
import { categorySlug, groupCategoryOptions } from "./options";

describe("categorySlug", () => {
  it.each([
    ["Makan & Minum", "makan-minum"],
    ["Transportasi", "transportasi"],
    ["  Kopi / Jajan  ", "kopi-jajan"],
    ["Café", "cafe"],
    ["Hadiah 2026", "hadiah-2026"],
  ])("%j → %j", (name, slug) => {
    expect(categorySlug(name)).toBe(slug);
  });
});

describe("groupCategoryOptions", () => {
  const category = (
    name: string,
    type: "EXPENSE" | "INCOME",
    isDefault = true,
  ) => ({ id: `${type}-${name}`, name, type, icon: null, isDefault });

  it("urutan bawaan tetap, kategori custom di belakang (alfabetis), dipisah per jenis", () => {
    const shuffled = [
      category("Zakat", "EXPENSE", false),
      category("Lainnya", "EXPENSE"),
      category("Gaji", "INCOME"),
      category("Kopi", "EXPENSE", false),
      ...DEFAULT_EXPENSE_CATEGORIES.filter((c) => c.name !== "Lainnya")
        .toReversed()
        .map((c) => category(c.name, "EXPENSE")),
    ];

    const grouped = groupCategoryOptions(shuffled);

    expect(grouped.EXPENSE.map((c) => c.name)).toEqual([
      ...DEFAULT_EXPENSE_CATEGORIES.map((c) => c.name),
      "Kopi",
      "Zakat",
    ]);
    expect(grouped.EXPENSE[0].slug).toBe("makan-minum");
    expect(grouped.INCOME.map((c) => c.name)).toEqual(["Gaji"]);
  });
});
