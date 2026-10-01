import { ChartPieIcon } from "lucide-react";

import { formatRupiah } from "~/lib/format";
import {
  REPORT_MESSAGES as M,
  type ExpenseCategoryReport as Report,
} from "~/modules/reports/view";

import { CategoryBreakdownList } from "./category-breakdown-list";
import { ExpenseCategoryChart } from "./expense-category-chart";

/**
 * Seksi "pengeluaran per kategori" bulan terpilih (E04-US02): total
 * pengeluaran, lalu donut + daftar kategori (HP: bertumpuk; desktop: donut
 * kiri, daftar kanan), atau empty state bila bulan tsb tanpa pengeluaran.
 */
export function ExpenseCategoryReport({ report }: { report: Report }) {
  const empty = report.items.length === 0;

  return (
    <section
      data-testid="expense-category-report"
      data-month={report.month}
      aria-labelledby="expense-category-report-title"
      className="flex flex-col gap-4 rounded-xl border bg-card p-4 md:p-6"
    >
      <div>
        <h2
          id="expense-category-report-title"
          className="text-sm text-muted-foreground"
        >
          {M.totalLabel}
        </h2>
        <p
          data-testid="report-total-expense"
          data-value={report.total}
          className="text-2xl font-semibold text-expense tabular-nums md:text-3xl"
        >
          {formatRupiah(BigInt(report.total))}
        </p>
      </div>

      {empty ? (
        <div
          data-testid="report-empty-state"
          className="flex flex-col items-center gap-2 px-4 py-10 text-center text-muted-foreground"
        >
          <ChartPieIcon className="size-10" aria-hidden />
          <p className="font-medium">{M.empty}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6 pt-2 md:flex-row md:items-center md:gap-10">
          <ExpenseCategoryChart
            slices={report.slices}
            total={report.total}
            monthLabel={report.monthLabel}
          />
          <CategoryBreakdownList items={report.items} className="w-full" />
        </div>
      )}
    </section>
  );
}
