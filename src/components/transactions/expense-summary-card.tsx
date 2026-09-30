import { formatMonthYear } from "~/lib/date";
import { formatRupiah } from "~/lib/format";

type ExpenseSummaryCardProps = {
  month: Date;
  expense: bigint;
};

/**
 * Total "Pengeluaran bulan ini" (E02-US01 AC 8). Versi minimal; kartu
 * ringkasan lengkap (pemasukan, saldo, anggaran) milik E04-US01.
 */
export function ExpenseSummaryCard({
  month,
  expense,
}: ExpenseSummaryCardProps) {
  return (
    <section
      aria-labelledby="summary-expense-label"
      className="rounded-xl border bg-card p-4"
    >
      <p id="summary-expense-label" className="text-sm text-muted-foreground">
        Pengeluaran bulan ini
        <span className="sr-only">, {formatMonthYear(month)}</span>
      </p>
      <p
        data-testid="summary-expense-total"
        data-value={expense.toString()}
        className="mt-1 text-2xl font-semibold text-expense tabular-nums"
      >
        {formatRupiah(expense)}
      </p>
    </section>
  );
}
