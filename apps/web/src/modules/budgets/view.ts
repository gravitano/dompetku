/**
 * Penyusunan data halaman Anggaran (E03-US01) + indikator pemakaian
 * (E03-US02) — murni & isomorfik, dipakai `./queries.ts` dan diuji unit.
 */
import type { CategoryType } from "~/generated/prisma/enums";
import { categorySlug, compareCategories } from "~/modules/categories/options";

import { budgetUsage, compareBudgetUsage, type BudgetUsage } from "./status";

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
  /**
   * Kategori terarsip yang masih punya anggaran atau pengeluaran bulan ini
   * (read-only).
   */
  archived: boolean;
  /** Nominal anggaran bulan ini, `null` = "Belum diatur". */
  amount: bigint | null;
  /** Total pengeluaran kategori ini di bulan tsb (E03-US02). */
  spent: bigint;
};

/** Baris beranggaran + indikator pemakaiannya (E03-US02). */
export type BudgetedRow = BudgetRow & { amount: bigint; usage: BudgetUsage };

/** Baris halaman Anggaran per bagian (E03-US02). */
export type BudgetSections = {
  /** Punya anggaran — urut persentase terpakai tertinggi dulu. */
  budgeted: BudgetedRow[];
  /** Tanpa anggaran tapi ada pengeluaran — urut nominal terbesar dulu. */
  unbudgeted: BudgetRow[];
  /** Tanpa anggaran & tanpa pengeluaran ("Belum diatur") — urutan form. */
  notSet: BudgetRow[];
};

export type BudgetMonthView = {
  /** "YYYY-MM" yang ditampilkan. */
  month: string;
  rows: BudgetRow[];
  /** `rows` per bagian halaman (E03-US02). */
  sections: BudgetSections;
  /** Jumlah semua anggaran bulan ini (termasuk kategori terarsip). */
  total: bigint;
  /**
   * Seluruh pengeluaran bulan ini, termasuk kategori tanpa anggaran (keputusan
   * PO — sama dengan `BudgetSummary.totalSpent` Beranda).
   */
  totalSpent: bigint;
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

const ZERO = BigInt(0);

/**
 * Baris halaman Anggaran: semua kategori pengeluaran aktif (urutan form: bawaan
 * urutan tetap, custom abjad), lalu kategori pengeluaran terarsip yang punya
 * anggaran atau pengeluaran bulan ini (abjad). Kategori pemasukan & terarsip
 * tanpa anggaran/pengeluaran tidak tampil. `spent` = pengeluaran per kategori
 * bulan tsb.
 */
export function buildBudgetRows(
  categories: readonly BudgetCategory[],
  budgets: readonly MonthBudget[],
  spent: ReadonlyMap<string, bigint> = new Map(),
): BudgetRow[] {
  const amountOf = new Map(budgets.map((b) => [b.categoryId, b.amount]));
  const spentOf = (id: string) => spent.get(id) ?? ZERO;
  const expense = categories.filter((c) => c.type === "EXPENSE");
  const active = expense.filter((c) => !c.archivedAt).sort(compareCategories);
  const archived = expense
    .filter((c) => c.archivedAt && (amountOf.has(c.id) || spentOf(c.id) > ZERO))
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
      spent: spentOf(c.id),
    };
  });
}

/**
 * Kelompokkan baris (urutan `buildBudgetRows`) per bagian halaman: beranggaran
 * (persentase tertinggi dulu; seri → urutan asal), tanpa anggaran tapi ada
 * pengeluaran (nominal terbesar dulu), dan "Belum diatur".
 */
export function groupBudgetRows(rows: readonly BudgetRow[]): BudgetSections {
  const budgeted: BudgetedRow[] = [];
  const unbudgeted: BudgetRow[] = [];
  const notSet: BudgetRow[] = [];
  for (const row of rows) {
    if (row.amount !== null) {
      budgeted.push({
        ...row,
        amount: row.amount,
        usage: budgetUsage(row.spent, row.amount),
      });
    } else if (row.spent > ZERO) {
      unbudgeted.push(row);
    } else {
      notSet.push(row);
    }
  }
  // Array.prototype.sort stabil: seri mempertahankan urutan asal.
  budgeted.sort((a, b) => compareBudgetUsage(a.usage, b.usage));
  unbudgeted.sort((a, b) =>
    a.spent === b.spent ? 0 : a.spent > b.spent ? -1 : 1,
  );
  return { budgeted, unbudgeted, notSet };
}

/** Jumlah seluruh pengeluaran per kategori. */
export function sumSpent(spent: ReadonlyMap<string, bigint>): bigint {
  let total = ZERO;
  for (const value of spent.values()) total += value;
  return total;
}

/** Jumlah nominal anggaran. */
export function sumBudgets(budgets: readonly { amount: bigint }[]): bigint {
  return budgets.reduce((sum, b) => sum + b.amount, BigInt(0));
}

export type BudgetSummary = {
  /** Jumlah semua anggaran bulan tsb. */
  totalBudget: bigint;
  /**
   * Seluruh pengeluaran bulan tsb, TERMASUK kategori tanpa anggaran (keputusan
   * PO; definisi sama untuk E03-US02 dan Beranda E04-US01).
   */
  totalSpent: bigint;
  /** 0 → Beranda menampilkan ajakan "Atur anggaran bulan ini". */
  budgetCount: number;
};

/** Ringkasan anggaran vs seluruh pengeluaran bulan (Beranda E04-US01). */
export function summarizeBudgets(
  budgets: readonly { amount: bigint }[],
  totalSpent: bigint,
): BudgetSummary {
  return {
    totalBudget: sumBudgets(budgets),
    totalSpent,
    budgetCount: budgets.length,
  };
}
