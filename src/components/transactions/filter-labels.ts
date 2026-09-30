import type { FilterCategory } from "~/modules/categories/options";
import type { TransactionType } from "~/modules/transactions/schema";

export const TYPE_LABELS: Record<TransactionType, string> = {
  EXPENSE: "Pengeluaran",
  INCOME: "Pemasukan",
};

/**
 * Nama kategori untuk chip/panel. Nama yang sama di dua jenis (mis.
 * "Lainnya") diberi keterangan jenis: "Lainnya (Pemasukan)".
 */
export function filterCategoryLabel(
  category: FilterCategory,
  categories: readonly FilterCategory[],
): string {
  const ambiguous = categories.some(
    (other) =>
      other.id !== category.id &&
      other.name === category.name &&
      other.type !== category.type,
  );
  return ambiguous
    ? `${category.name} (${TYPE_LABELS[category.type]})`
    : category.name;
}
