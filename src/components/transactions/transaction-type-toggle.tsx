"use client";

import { cn } from "~/lib/utils";
import type { TransactionType } from "~/modules/transactions/schema";

type TransactionTypeToggleProps = {
  value: TransactionType;
  onChange: (type: TransactionType) => void;
  /** Jenis yang belum bisa dipilih (mis. Pemasukan sebelum E02-US02). */
  disabledTypes?: readonly TransactionType[];
};

const OPTIONS: ReadonlyArray<{
  type: TransactionType;
  label: string;
  testId: string;
  activeClass: string;
}> = [
  {
    type: "EXPENSE",
    label: "Pengeluaran",
    testId: "transaction-type-toggle-expense",
    activeClass: "bg-background text-expense shadow-sm",
  },
  {
    type: "INCOME",
    label: "Pemasukan",
    testId: "transaction-type-toggle-income",
    activeClass: "bg-background text-income shadow-sm",
  },
];

/** Segmented control **Pengeluaran | Pemasukan** di atas form transaksi. */
export function TransactionTypeToggle({
  value,
  onChange,
  disabledTypes = [],
}: TransactionTypeToggleProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Jenis transaksi"
      data-testid="transaction-type-toggle"
      className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1"
    >
      {OPTIONS.map((option) => {
        const checked = option.type === value;
        const disabled = disabledTypes.includes(option.type);
        return (
          <button
            key={option.type}
            type="button"
            role="radio"
            aria-checked={checked}
            data-state={checked ? "checked" : "unchecked"}
            data-testid={option.testId}
            disabled={disabled}
            title={disabled ? "Segera hadir" : undefined}
            onClick={() => onChange(option.type)}
            className={cn(
              "h-8 rounded-md text-sm font-medium text-muted-foreground transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50",
              checked && option.activeClass,
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
