import { WalletIcon } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "~/components/ui/button";
import { TRANSACTION_LIST_MESSAGES } from "~/modules/transactions/schema";

type TransactionsEmptyStateProps = {
  /** "September 2026". */
  period: string;
  filtered: boolean;
  onReset: () => void;
  /** Tombol "Catat transaksi" (membuka form) untuk empty state tanpa filter. */
  addAction: ReactNode;
};

/** Empty state tab Transaksi (E02-US03 AC 8). */
export function TransactionsEmptyState({
  period,
  filtered,
  onReset,
  addAction,
}: TransactionsEmptyStateProps) {
  return (
    <div
      data-testid="transactions-empty"
      data-filtered={filtered}
      className="mt-4 flex flex-col items-center gap-3 rounded-xl border border-dashed px-4 py-10 text-center"
    >
      {filtered ? null : (
        <span className="flex size-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <WalletIcon className="size-7" aria-hidden />
        </span>
      )}
      <p
        data-testid="transactions-empty-message"
        className="text-sm text-muted-foreground"
      >
        {filtered
          ? TRANSACTION_LIST_MESSAGES.emptyFiltered
          : `Belum ada transaksi di ${period}`}
      </p>
      {filtered ? (
        <Button
          variant="outline"
          data-testid="empty-reset-filter-button"
          onClick={onReset}
        >
          Reset filter
        </Button>
      ) : (
        addAction
      )}
    </div>
  );
}
