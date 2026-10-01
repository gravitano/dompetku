import { formatRupiah } from "~/lib/format";
import { cn } from "~/lib/utils";
import { BUDGET_MESSAGES as M } from "~/modules/budgets/schema";
import {
  BUDGET_STATUS_COLOR,
  budgetBalanceLabel,
  budgetUsage,
} from "~/modules/budgets/status";

import { BudgetProgress } from "./budget-progress";
import { BUDGET_STATUS_CLASS, BudgetStatusIcon } from "./budget-status";

/**
 * Kartu ringkasan halaman Anggaran (E03-US02 UX-01): "Terpakai Rp X dari Rp Y"
 * (seluruh pengeluaran bulan tsb vs total anggaran), progress bar, persentase,
 * dan "Sisa Rp Z" / "Lebih Rp Z" dengan aturan warna yang sama dengan baris
 * kategori. Tanpa anggaran: hanya total anggaran (Rp 0) dan total terpakai.
 */
export function BudgetSummaryCard({
  totalBudget,
  totalSpent,
  budgetCount,
  period,
}: {
  totalBudget: bigint;
  totalSpent: bigint;
  budgetCount: number;
  /** "Oktober 2026". */
  period: string;
}) {
  const spent = (
    <span
      data-testid="budget-summary-spent"
      data-value={totalSpent.toString()}
      className="whitespace-nowrap tabular-nums"
    >
      {formatRupiah(totalSpent)}
    </span>
  );
  const total = (
    <span
      data-testid="budget-total"
      data-value={totalBudget.toString()}
      className="whitespace-nowrap tabular-nums"
    >
      {formatRupiah(totalBudget)}
    </span>
  );

  if (budgetCount === 0) {
    return (
      <section
        data-testid="budget-summary-card"
        aria-label={`${M.totalLabel} ${period}`}
        className="flex flex-col gap-1 rounded-xl border bg-card p-4"
      >
        <p className="text-sm text-muted-foreground">
          {M.totalLabel}
          <span className="sr-only">, {period}</span>
        </p>
        <p className="truncate text-2xl font-semibold">{total}</p>
        {totalSpent > BigInt(0) ? (
          <p className="text-sm text-muted-foreground">
            {M.spentLabel} {spent}
          </p>
        ) : null}
      </section>
    );
  }

  const usage = budgetUsage(totalSpent, totalBudget);
  const tone = BUDGET_STATUS_CLASS[usage.status].text;
  return (
    <section
      data-testid="budget-summary-card"
      data-status={BUDGET_STATUS_COLOR[usage.status]}
      aria-label={`${M.summaryLabel} ${period}`}
      className="flex flex-col gap-3 rounded-xl border bg-card p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 text-sm text-muted-foreground">
          <span className="block">
            {M.summaryLabel}
            <span className="sr-only">, {period}</span>
          </span>
          <span className="mt-1 block text-base text-foreground">
            {M.spentLabel}{" "}
            <span className="text-xl font-semibold">{spent}</span> dari{" "}
            <span className="font-semibold">{total}</span>
          </span>
        </p>
        <span
          className={cn(
            "flex shrink-0 items-center gap-1 text-xl font-semibold tabular-nums",
            tone,
          )}
        >
          <BudgetStatusIcon status={usage.status} />
          <span data-testid="budget-summary-percent">{usage.percent}%</span>
        </span>
      </div>
      <BudgetProgress
        usage={usage}
        label={`${M.summaryLabel} ${period}`}
        testId="budget-summary-progress"
      />
      <p
        data-testid="budget-summary-remaining"
        className={cn(
          "text-sm font-medium tabular-nums",
          usage.overBy > BigInt(0) ? tone : "text-muted-foreground",
        )}
      >
        {budgetBalanceLabel(usage)}
      </p>
    </section>
  );
}
