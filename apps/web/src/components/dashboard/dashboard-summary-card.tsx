import { NetAmount } from "~/components/transactions/transaction-amount";
import { formatRupiah } from "~/lib/format";
import { cn } from "~/lib/utils";
import {
  DASHBOARD_MESSAGES as M,
  type NetState,
} from "~/modules/dashboard/view";

type DashboardSummaryCardProps = {
  /** "Oktober 2026" — untuk label aksesibel. */
  period: string;
  income: bigint;
  expense: bigint;
  net: bigint;
  netState: NetState;
};

/**
 * Kartu ringkasan Beranda (E04-US01 UX-01): Pemasukan, Pengeluaran, dan
 * Selisih bulan berjalan. HP: pemasukan & pengeluaran berdampingan, selisih
 * besar di bawah; desktop: tiga kolom sejajar. Selisih hijau "+", merah "−",
 * netral bila nol (`data-state`).
 */
export function DashboardSummaryCard({
  period,
  income,
  expense,
  net,
  netState,
}: DashboardSummaryCardProps) {
  const totals = [
    { key: "income", label: M.income, value: income, className: "text-income" },
    {
      key: "expense",
      label: M.expense,
      value: expense,
      className: "text-expense",
    },
  ] as const;

  return (
    <section
      aria-label={`Ringkasan ${period}`}
      data-testid="month-summary"
      className="grid grid-cols-2 rounded-xl border bg-card md:grid-cols-3"
    >
      {totals.map((item, index) => (
        <div
          key={item.key}
          className={cn("min-w-0 p-4", index > 0 && "border-l")}
        >
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
      <div className="col-span-2 min-w-0 border-t p-4 md:col-span-1 md:border-t-0 md:border-l">
        <p className="text-sm text-muted-foreground">
          {M.net}
          <span className="sr-only">, {period}</span>
        </p>
        <p
          data-testid="summary-balance"
          data-state={netState}
          data-value={net.toString()}
          className="mt-1 truncate text-2xl font-bold"
        >
          <NetAmount value={net} showPlus />
        </p>
      </div>
    </section>
  );
}
