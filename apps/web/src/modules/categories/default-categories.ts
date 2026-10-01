/**
 * Data kategori bawaan (ITA §4.2) — modul murni tanpa import, sehingga aman
 * dipakai lintas package (mis. fixture E2E `apps/test` lewat
 * `web/categories/defaults`). Logika seeding ada di `./defaults`.
 */

/** Sama dengan enum Prisma `CategoryType`. */
export type DefaultCategoryType = "INCOME" | "EXPENSE";

export type DefaultCategory = {
  name: string;
  type: DefaultCategoryType;
  icon: string;
};

export const DEFAULT_EXPENSE_CATEGORIES: readonly DefaultCategory[] = [
  { name: "Makan & Minum", type: "EXPENSE", icon: "utensils" },
  { name: "Transportasi", type: "EXPENSE", icon: "bus" },
  { name: "Belanja", type: "EXPENSE", icon: "shopping-cart" },
  { name: "Tagihan", type: "EXPENSE", icon: "receipt" },
  { name: "Hiburan", type: "EXPENSE", icon: "clapperboard" },
  { name: "Kesehatan", type: "EXPENSE", icon: "heart-pulse" },
  { name: "Lainnya", type: "EXPENSE", icon: "package" },
];

export const DEFAULT_INCOME_CATEGORIES: readonly DefaultCategory[] = [
  { name: "Gaji", type: "INCOME", icon: "wallet" },
  { name: "Bonus", type: "INCOME", icon: "gift" },
  { name: "Hadiah", type: "INCOME", icon: "party-popper" },
  { name: "Lainnya", type: "INCOME", icon: "package" },
];

export const DEFAULT_CATEGORIES: readonly DefaultCategory[] = [
  ...DEFAULT_EXPENSE_CATEGORIES,
  ...DEFAULT_INCOME_CATEGORIES,
];
