import { Skeleton } from "~/components/ui/skeleton";
import { formatRupiah } from "~/lib/format";
import type { TransactionListSummary } from "~/modules/transactions/list";

import { NetAmount } from "./transaction-amount";

type PeriodSummaryCardProps = {
  /** "September 2026" — untuk label aksesibel. */
  period: string;
  summary: TransactionListSummary;
  /** Skeleton saat periode/filter sedang dimuat ulang. */
  loading?: boolean;
};

/**
 * Ringkasan tab Transaksi (E02-US03 AC 5, 9): Pemasukan, Pengeluaran, dan
 * Selisih untuk periode + filter aktif — dari seluruh transaksi periode,
 * bukan hanya yang sudah tampil.
 */
export function PeriodSummaryCard({
  period,
  summary,
  loading = false,
}: PeriodSummaryCardProps) {
  const items = [
    {
      key: "income",
      label: "Pemasukan",
      value: (
        <span className="text-income" data-value={summary.income.toString()}>
          {formatRupiah(summary.income)}
        </span>
      ),
    },
    {
      key: "expense",
      label: "Pengeluaran",
      value: (
        <span className="text-expense" data-value={summary.expense.toString()}>
          {formatRupiah(summary.expense)}
        </span>
      ),
    },
    { key: "net", label: "Selisih", value: <NetAmount value={summary.net} /> },
  ] as const;

  return (
    <section
      aria-label={`Ringkasan ${period}`}
      aria-busy={loading}
      data-testid="period-summary"
      className="grid grid-cols-3 divide-x rounded-xl border bg-card"
    >
      {items.map((item) => (
        <div key={item.key} className="min-w-0 px-3 py-3 sm:px-4">
          <p className="text-xs text-muted-foreground sm:text-sm">
            {item.label}
          </p>
          {loading ? (
            <Skeleton
              data-testid={`summary-${item.key}-skeleton`}
              className="mt-1.5 h-5 w-full max-w-28"
            />
          ) : (
            <p
              data-testid={`summary-${item.key}`}
              className="mt-1 truncate text-sm font-semibold tabular-nums sm:text-lg"
            >
              {item.value}
            </p>
          )}
        </div>
      ))}
    </section>
  );
}
