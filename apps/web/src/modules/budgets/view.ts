/**
 * Penyusunan data halaman Anggaran (E03-US01) — murni & isomorfik, dipakai
 * `./queries.ts` dan diuji unit. Dipakai ulang E03-US02 (indikator).
 */
import type { CategoryType } from "~/generated/prisma/enums";
import { categorySlug, compareCategories } from "~/modules/categories/options";

/** Satu baris kategori di halaman Anggaran. */
export type BudgetRow = {
  categoryId: string;
  name: string;
  icon: string | null;
  /**
   * Kunci unik untuk `data-testid="budget-row-<slug>"`: slug nama, ditambah
   * nomor urut bila dua nama menghasilkan slug yang sama.
   */
  slug: string;
  /** Kategori terarsip yang masih punya anggaran bulan ini (read-only). */
  archived: boolean;
  /** Nominal anggaran bulan ini, `null` = "Belum diatur". */
  amount: bigint | null;
};

export type BudgetMonthView = {
  /** "YYYY-MM" yang ditampilkan. */
  month: string;
  rows: BudgetRow[];
  /** Jumlah semua anggaran bulan ini (termasuk kategori terarsip). */
  total: bigint;
  /** Jumlah kategori yang punya anggaran bulan ini. */
  budgetCount: number;
  /**
   * Jumlah anggaran bulan sebelumnya yang bisa disalin (kategori pengeluaran
   * yang masih aktif) — tombol "Salin dari bulan lalu" (AC 9).
   */
  copyableFromPrevious: number;
};

export type BudgetCategory = {
  id: string;
  name: string;
  type: CategoryType;
  icon: string | null;
  isDefault: boolean;
  archivedAt: Date | null;
};

export type MonthBudget = { categoryId: string; amount: bigint };

/**
 * Baris halaman Anggaran: semua kategori pengeluaran aktif (urutan form: bawaan
 * urutan tetap, custom abjad), lalu kategori pengeluaran terarsip yang punya
 * anggaran bulan ini (abjad). Kategori pemasukan & terarsip tanpa anggaran
 * tidak tampil.
 */
export function buildBudgetRows(
  categories: readonly BudgetCategory[],
  budgets: readonly MonthBudget[],
): BudgetRow[] {
  const amountOf = new Map(budgets.map((b) => [b.categoryId, b.amount]));
  const expense = categories.filter((c) => c.type === "EXPENSE");
  const active = expense.filter((c) => !c.archivedAt).sort(compareCategories);
  const archived = expense
    .filter((c) => c.archivedAt && amountOf.has(c.id))
    .sort((a, b) => a.name.localeCompare(b.name, "id"));

  const used = new Set<string>();
  return [...active, ...archived].map((c) => {
    const stem = categorySlug(c.name) || "kategori";
    let slug = stem;
    for (let n = 2; used.has(slug); n++) slug = `${stem}-${n}`;
    used.add(slug);
    return {
      categoryId: c.id,
      name: c.name,
      icon: c.icon,
      slug,
      archived: !!c.archivedAt,
      amount: amountOf.get(c.id) ?? null,
    };
  });
}

/** Jumlah nominal anggaran. */
export function sumBudgets(budgets: readonly { amount: bigint }[]): bigint {
  return budgets.reduce((sum, b) => sum + b.amount, BigInt(0));
}
