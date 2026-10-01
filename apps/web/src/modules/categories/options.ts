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
  /**
   * Kategori terarsip yang masih dipakai transaksi yang sedang diubah
   * (E02-US04 AC 6) — hanya untuk menampilkan pilihan saat ini, bukan pilihan
   * baru.
   */
  archived?: boolean;
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

/** Kategori di panel filter daftar transaksi (E02-US03), termasuk terarsip. */
export type FilterCategory = {
  id: string;
  name: string;
  type: CategoryType;
  icon: string | null;
  isDefault: boolean;
  archived: boolean;
  /**
   * Kunci unik untuk `data-testid="filter-category-<key>"` / `filter-chip-<key>`:
   * slug nama; bila bentrok (mis. "Lainnya" di dua jenis) ditambah jenis
   * (`lainnya-expense`), lalu `-archived` / nomor urut bila masih bentrok.
   */
  key: string;
};

/**
 * Urutkan kategori filter: aktif dulu (urutan form per jenis: pengeluaran lalu
 * pemasukan), lalu kategori terarsip (alfabetis) — dikelompokkan "Diarsipkan"
 * di panel filter.
 */
export function buildFilterCategories(
  categories: ReadonlyArray<
    Omit<CategoryOption, "slug"> & { archivedAt: Date | null }
  >,
): FilterCategory[] {
  const typeRank = (type: CategoryType) => (type === "EXPENSE" ? 0 : 1);
  const sorted = [...categories].sort(
    (a, b) =>
      Number(!!a.archivedAt) - Number(!!b.archivedAt) ||
      (a.archivedAt
        ? a.name.localeCompare(b.name, "id") ||
          typeRank(a.type) - typeRank(b.type)
        : typeRank(a.type) - typeRank(b.type) || compareCategories(a, b)),
  );

  const slugCount = new Map<string, number>();
  for (const c of sorted) {
    const slug = categorySlug(c.name) || "kategori";
    slugCount.set(slug, (slugCount.get(slug) ?? 0) + 1);
  }

  const used = new Set<string>();
  return sorted.map((c) => {
    const slug = categorySlug(c.name) || "kategori";
    const typed = `${slug}-${c.type.toLowerCase()}`;
    let key = (slugCount.get(slug) ?? 0) > 1 ? typed : slug;
    if (used.has(key)) key = `${typed}${c.archivedAt ? "-archived" : ""}`;
    const stem = key;
    for (let n = 2; used.has(key); n++) key = `${stem}-${n}`;
    used.add(key);
    return {
      id: c.id,
      name: c.name,
      type: c.type,
      icon: c.icon,
      isDefault: c.isDefault,
      archived: !!c.archivedAt,
      key,
    };
  });
}

/** Kategori di halaman Kelola Kategori (E02-US05). */
export type ManagedCategory = {
  id: string;
  name: string;
  type: CategoryType;
  icon: string | null;
  isDefault: boolean;
  archived: boolean;
  /** Jumlah transaksi yang memakai kategori ini (semua waktu). */
  transactionCount: number;
  /**
   * Kunci unik per jenis untuk `data-testid="category-row-<slug>"` /
   * `category-restore-button-<slug>`: slug nama, ditambah nomor urut bila
   * dua nama berbeda menghasilkan slug yang sama.
   */
  slug: string;
};

/**
 * Urutkan kategori halaman Kategori: aktif lalu terarsip, masing-masing urut
 * abjad (design "Default"), dengan slug unik per jenis.
 */
export function buildManagedCategories(
  categories: ReadonlyArray<
    Omit<ManagedCategory, "slug" | "archived"> & { archivedAt: Date | null }
  >,
): ManagedCategory[] {
  const sorted = [...categories].sort(
    (a, b) =>
      Number(!!a.archivedAt) - Number(!!b.archivedAt) ||
      a.name.localeCompare(b.name, "id", { sensitivity: "base" }) ||
      a.id.localeCompare(b.id),
  );
  const used = new Set<string>();
  return sorted.map(({ archivedAt, ...c }) => {
    const stem = categorySlug(c.name) || "kategori";
    let slug = stem;
    for (let n = 2; used.has(`${c.type}:${slug}`); n++) slug = `${stem}-${n}`;
    used.add(`${c.type}:${slug}`);
    return { ...c, archived: !!archivedAt, slug };
  });
}
