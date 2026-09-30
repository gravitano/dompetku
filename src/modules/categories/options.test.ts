import { describe, expect, it } from "vitest";

import { DEFAULT_EXPENSE_CATEGORIES } from "./defaults";
import {
  buildFilterCategories,
  buildManagedCategories,
  categorySlug,
  groupCategoryOptions,
} from "./options";

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

describe("buildFilterCategories (E02-US03 panel filter)", () => {
  const archivedAt = new Date("2026-09-01T00:00:00Z");
  const category = (
    id: string,
    name: string,
    type: "EXPENSE" | "INCOME",
    extra: { isDefault?: boolean; archivedAt?: Date | null } = {},
  ) => ({
    id,
    name,
    type,
    icon: null,
    isDefault: extra.isDefault ?? true,
    archivedAt: extra.archivedAt ?? null,
  });

  it("aktif dulu (urutan form per jenis), terarsip di bawah", () => {
    const result = buildFilterCategories([
      category("g", "Gaji", "INCOME"),
      category("t", "Tagihan", "EXPENSE", { archivedAt }),
      category("m", "Makan & Minum", "EXPENSE"),
      category("k", "Kopi", "EXPENSE", { isDefault: false }),
      category("b", "Belanja", "EXPENSE"),
    ]);
    expect(result.map((c) => [c.name, c.archived])).toEqual([
      ["Makan & Minum", false],
      ["Belanja", false],
      ["Kopi", false],
      ["Gaji", false],
      ["Tagihan", true],
    ]);
    expect(result.find((c) => c.id === "t")?.key).toBe("tagihan");
  });

  it("key unik bila nama sama di dua jenis / aktif & terarsip", () => {
    const result = buildFilterCategories([
      category("le", "Lainnya", "EXPENSE"),
      category("li", "Lainnya", "INCOME"),
      category("la", "Lainnya", "EXPENSE", {
        isDefault: false,
        archivedAt,
      }),
      category("m", "Makan & Minum", "EXPENSE"),
    ]);
    const keys = Object.fromEntries(result.map((c) => [c.id, c.key]));
    expect(keys).toEqual({
      le: "lainnya-expense",
      li: "lainnya-income",
      la: "lainnya-expense-archived",
      m: "makan-minum",
    });
  });
});

describe("buildManagedCategories (E02-US05 halaman Kategori)", () => {
  const archivedAt = new Date("2026-09-01T00:00:00Z");
  const category = (
    id: string,
    name: string,
    type: "EXPENSE" | "INCOME" = "EXPENSE",
    extra: { archivedAt?: Date | null; transactionCount?: number } = {},
  ) => ({
    id,
    name,
    type,
    icon: null,
    isDefault: false,
    archivedAt: extra.archivedAt ?? null,
    transactionCount: extra.transactionCount ?? 0,
  });

  it("aktif lalu terarsip, masing-masing abjad; flag archived", () => {
    const result = buildManagedCategories([
      category("t", "Transportasi"),
      category("g", "Game", "EXPENSE", { archivedAt }),
      category("b", "belanja"),
      category("a", "Arisan", "EXPENSE", { archivedAt }),
      category("k", "Kopi", "EXPENSE", { transactionCount: 3 }),
    ]);
    expect(result.map((c) => [c.name, c.archived])).toEqual([
      ["belanja", false],
      ["Kopi", false],
      ["Transportasi", false],
      ["Arisan", true],
      ["Game", true],
    ]);
    expect(result[1]).toMatchObject({ slug: "kopi", transactionCount: 3 });
  });

  it("slug unik per jenis bila nama berbeda menghasilkan slug sama", () => {
    const result = buildManagedCategories([
      category("1", "Kopi!"),
      category("2", "Kopi"),
      category("3", "Kopi", "INCOME"),
    ]);
    expect(Object.fromEntries(result.map((c) => [c.id, c.slug]))).toEqual({
      "2": "kopi",
      "1": "kopi-2",
      "3": "kopi",
    });
  });
});
