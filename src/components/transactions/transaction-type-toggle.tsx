"use client";

import { cn } from "~/lib/utils";
import type { TransactionType } from "~/modules/transactions/schema";

type TransactionTypeToggleProps = {
  value: TransactionType;
  onChange: (type: TransactionType) => void;
  /** Nonaktif saat form sedang menyimpan (jenis tidak boleh berubah). */
  disabled?: boolean;
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

const ARROW_KEYS = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"];

/**
 * Segmented control **Pengeluaran | Pemasukan** di atas form transaksi
 * (E02-US02 UX-01/UX-05): jenis aktif berwarna merah / hijau. Panah
 * kiri/kanan berpindah jenis (pola radiogroup). Nonaktif selama `disabled`.
 */
export function TransactionTypeToggle({
  value,
  onChange,
  disabled = false,
}: TransactionTypeToggleProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Jenis transaksi"
      aria-disabled={disabled || undefined}
      data-testid="transaction-type-toggle"
      className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1"
    >
      {OPTIONS.map((option) => {
        const checked = option.type === value;
        return (
          <button
            key={option.type}
            type="button"
            role="radio"
            aria-checked={checked}
            data-state={checked ? "checked" : "unchecked"}
            data-testid={option.testId}
            tabIndex={checked ? 0 : -1}
            disabled={disabled}
            onClick={() => onChange(option.type)}
            onKeyDown={(event) => {
              if (!ARROW_KEYS.includes(event.key)) return;
              event.preventDefault();
              const other = OPTIONS.find((o) => o.type !== value)!;
              onChange(other.type);
              event.currentTarget.parentElement
                ?.querySelector<HTMLButtonElement>(
                  `[data-testid="${other.testId}"]`,
                )
                ?.focus();
            }}
            className={cn(
              "h-8 rounded-md text-sm font-medium text-muted-foreground transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-60",
              checked ? option.activeClass : "hover:text-foreground",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
