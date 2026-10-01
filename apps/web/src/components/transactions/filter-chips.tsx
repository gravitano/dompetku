import { XIcon } from "lucide-react";

import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import type { FilterCategory } from "~/modules/categories/options";
import type {
  TransactionListFilter,
  TransactionType,
} from "~/modules/transactions/schema";

import { filterCategoryLabel, TYPE_LABELS } from "./filter-labels";

type FilterChipsProps = {
  filter: TransactionListFilter;
  categories: readonly FilterCategory[];
  onRemoveType: () => void;
  onRemoveCategory: (id: string) => void;
  onReset: () => void;
};

const TYPE_TONE: Record<TransactionType, string> = {
  EXPENSE: "border-expense/40 text-expense",
  INCOME: "border-income/40 text-income",
};

function Chip({
  label,
  testId,
  className,
  onRemove,
}: {
  label: string;
  testId: string;
  className?: string;
  onRemove: () => void;
}) {
  return (
    <li className="shrink-0">
      <button
        type="button"
        data-testid={testId}
        aria-label={`Hapus filter ${label}`}
        onClick={onRemove}
        className={cn(
          "flex h-8 items-center gap-1.5 rounded-full border bg-card pr-2 pl-3 text-sm font-medium whitespace-nowrap transition-colors outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50",
          className,
        )}
      >
        {label}
        <XIcon className="size-3.5 opacity-70" aria-hidden />
      </button>
    </li>
  );
}

/**
 * Chip filter aktif (E02-US03 AC 6, UX-04): tap ✕ melepas satu filter;
 * "Reset filter" melepas semua. Baris bisa di-scroll horizontal di HP.
 */
export function FilterChips({
  filter,
  categories,
  onRemoveType,
  onRemoveCategory,
  onReset,
}: FilterChipsProps) {
  const byId = new Map(categories.map((c) => [c.id, c]));
  const selected = filter.categoryIds
    .map((id) => byId.get(id))
    .filter((c): c is FilterCategory => !!c);
  if (!filter.type && selected.length === 0) return null;

  return (
    <div
      data-testid="filter-chips"
      className="-mx-4 flex [scrollbar-width:none] items-center gap-2 overflow-x-auto px-4 pb-1"
    >
      <ul aria-label="Filter aktif" className="flex items-center gap-2">
        {filter.type ? (
          <Chip
            label={TYPE_LABELS[filter.type]}
            testId="filter-chip-type"
            className={TYPE_TONE[filter.type]}
            onRemove={onRemoveType}
          />
        ) : null}
        {selected.map((category) => (
          <Chip
            key={category.id}
            label={filterCategoryLabel(category, categories)}
            testId={`filter-chip-${category.key}`}
            onRemove={() => onRemoveCategory(category.id)}
          />
        ))}
      </ul>
      <Button
        variant="link"
        size="sm"
        data-testid="filter-chips-reset-button"
        className="shrink-0 px-1"
        onClick={onReset}
      >
        Reset filter
      </Button>
    </div>
  );
}
