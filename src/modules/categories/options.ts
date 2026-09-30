/**
 * Kategori sebagai pilihan di form (isomorfik: dipakai query server & komponen
 * client). Kategori terarsip tidak pernah menjadi pilihan.
 */
import type { CategoryType } from "~/generated/prisma/enums";

import { DEFAULT_CATEGORIES } from "./defaults";

export type CategoryOption = {
  id: string;
  name: string;
  type: CategoryType;
  icon: string | null;
  /** Dipakai untuk `data-testid="category-option-<slug>"`. */
  slug: string;
  isDefault: boolean;
};

export type CategoryOptionsByType = Record<CategoryType, CategoryOption[]>;

/** "Makan & Minum" → "makan-minum", "Kesehatan" → "kesehatan". */
export function categorySlug(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const DEFAULT_ORDER = new Map(
  DEFAULT_CATEGORIES.map((c, index) => [`${c.type}:${c.name}`, index]),
);

/**
 * Urutan tetap (proposal E02-US01): kategori bawaan sesuai urutan
 * `DEFAULT_CATEGORIES`, lalu kategori custom alfabetis.
 */
export function compareCategories(
  a: Pick<CategoryOption, "name" | "type" | "isDefault">,
  b: Pick<CategoryOption, "name" | "type" | "isDefault">,
): number {
  const rank = (c: typeof a) =>
    c.isDefault
      ? (DEFAULT_ORDER.get(`${c.type}:${c.name}`) ?? DEFAULT_ORDER.size)
      : DEFAULT_ORDER.size + 1;
  return rank(a) - rank(b) || a.name.localeCompare(b.name, "id");
}

/** Kelompokkan & urutkan pilihan kategori per jenis. */
export function groupCategoryOptions(
  categories: ReadonlyArray<Omit<CategoryOption, "slug">>,
): CategoryOptionsByType {
  const sorted = [...categories]
    .sort(compareCategories)
    .map((c) => ({ ...c, slug: categorySlug(c.name) }));
  return {
    EXPENSE: sorted.filter((c) => c.type === "EXPENSE"),
    INCOME: sorted.filter((c) => c.type === "INCOME"),
  };
}
