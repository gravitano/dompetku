import { describe, expect, it } from "vitest";

import { CATEGORY_ICON_KEYS, CATEGORY_ICONS } from "./icons";
import { DEFAULT_CATEGORIES } from "./defaults";
import {
  CATEGORY_MESSAGES as M,
  categoriesHref,
  categoryCreateSchema,
  categoryFormSchema,
  categoryUpdateSchema,
  normalizeCategoryName,
  parseCategoryTab,
} from "./schema";

const firstMessage = (result: { success: boolean; error?: unknown }) =>
  (result as { error?: { issues: Array<{ message: string }> } }).error
    ?.issues[0]?.message;

describe("categoryFormSchema", () => {
  it("nama di-trim, ikon dari daftar", () => {
    expect(
      categoryFormSchema.parse({ name: "  Kopi  ", icon: "coffee" }),
    ).toEqual({ name: "Kopi", icon: "coffee" });
  });

  it.each([
    ["", M.nameRequired],
    ["   ", M.nameRequired],
    ["x".repeat(31), M.nameTooLong],
  ])("nama %j → %s", (name, message) => {
    expect(
      firstMessage(categoryFormSchema.safeParse({ name, icon: "coffee" })),
    ).toBe(message);
  });

  it("30 karakter (setelah trim) masih valid", () => {
    expect(
      categoryFormSchema.safeParse({
        name: ` ${"x".repeat(30)} `,
        icon: "coffee",
      }).success,
    ).toBe(true);
  });

  it.each([undefined, "", "emoji-☕", "unknown"])(
    "ikon %j → Pilih ikon",
    (icon) => {
      expect(
        firstMessage(categoryFormSchema.safeParse({ name: "Kopi", icon })),
      ).toBe(M.iconRequired);
    },
  );

  it("create butuh jenis valid, update butuh id UUID", () => {
    expect(
      categoryCreateSchema.safeParse({
        name: "Kopi",
        icon: "coffee",
        type: "TRANSFER",
      }).success,
    ).toBe(false);
    expect(
      categoryUpdateSchema.safeParse({
        id: "cat-ani-1",
        name: "Kopi",
        icon: "coffee",
      }).success,
    ).toBe(false);
  });
});

describe("ikon kategori", () => {
  it("24 pilihan unik dan mencakup ikon kategori bawaan", () => {
    expect(CATEGORY_ICONS).toHaveLength(24);
    expect(new Set(CATEGORY_ICON_KEYS).size).toBe(24);
    for (const category of DEFAULT_CATEGORIES) {
      expect(CATEGORY_ICON_KEYS).toContain(category.icon);
    }
  });
});

describe("helper", () => {
  it("normalizeCategoryName: trim + tanpa membedakan huruf besar/kecil", () => {
    expect(normalizeCategoryName("  MAKAN & Minum ")).toBe("makan & minum");
  });

  it("parseCategoryTab & categoriesHref", () => {
    expect(parseCategoryTab("income")).toBe("INCOME");
    expect(parseCategoryTab(["INCOME"])).toBe("INCOME");
    expect(parseCategoryTab("expense")).toBe("EXPENSE");
    expect(parseCategoryTab(undefined)).toBe("EXPENSE");
    expect(parseCategoryTab("x")).toBe("EXPENSE");
    expect(categoriesHref("INCOME")).toBe("/categories?type=income");
    expect(categoriesHref("EXPENSE")).toBe("/categories");
  });
});
