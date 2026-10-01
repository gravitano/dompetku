import { formatMonthYear } from "~/lib/date";
import { formatRupiah } from "~/lib/format";
import { cn } from "~/lib/utils";

type MonthSummaryCardProps = {
  month: Date;
  income: bigint;
  expense: bigint;
};

/**
 * Total "Pemasukan bulan ini" & "Pengeluaran bulan ini" (E02-US01 AC 8,
 * E02-US02 AC 5–6). Versi minimal; saldo & anggaran ditambahkan E04-US01
 * dengan selector yang sama (`summary-income-total`, `summary-expense-total`).
 */
export function MonthSummaryCard({
  month,
  income,
  expense,
}: MonthSummaryCardProps) {
  const period = formatMonthYear(month);
  const items = [
    {
      key: "income",
      label: "Pemasukan bulan ini",
      value: income,
      className: "text-income",
    },
    {
      key: "expense",
      label: "Pengeluaran bulan ini",
      value: expense,
      className: "text-expense",
    },
  ] as const;

  return (
    <section
      aria-label={`Ringkasan ${period}`}
      data-testid="month-summary"
      className="grid grid-cols-2 divide-x rounded-xl border bg-card"
    >
      {items.map((item) => (
        <div key={item.key} className="min-w-0 p-4">
          <p className="text-sm text-muted-foreground">
            {item.label}
            <span className="sr-only">, {period}</span>
          </p>
          <p
            data-testid={`summary-${item.key}-total`}
            data-value={item.value.toString()}
            className={cn(
              "mt-1 truncate text-lg font-semibold tabular-nums sm:text-2xl",
              item.className,
            )}
          >
            {formatRupiah(item.value)}
          </p>
        </div>
      ))}
    </section>
  );
}
