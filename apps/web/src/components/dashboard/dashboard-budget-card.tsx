import { ChevronRightIcon, TargetIcon } from "lucide-react";
import Link from "next/link";

import { BudgetProgress } from "~/components/budgets/budget-progress";
import {
  BUDGET_STATUS_CLASS,
  budgetBalanceTone,
  BudgetStatusIcon,
} from "~/components/budgets/budget-status";
import { formatRupiah } from "~/lib/format";
import { cn } from "~/lib/utils";
import { budgetsHref } from "~/modules/budgets/schema";
import {
  BUDGET_STATUS_COLOR,
  budgetBalanceLabel,
  type BudgetUsage,
} from "~/modules/budgets/status";
import { DASHBOARD_MESSAGES as M } from "~/modules/dashboard/view";

type DashboardBudgetCardProps = {
  /** Pemakaian total anggaran bulan berjalan; `null` bila belum diatur. */
  usage: BudgetUsage | null;
  /** "Oktober 2026". */
  period: string;
};

/**
 * Ringkasan anggaran di Beranda (E04-US01 AC 4–5, UX-02): "Rp X dari Rp Y"
 * (seluruh pengeluaran bulan berjalan vs total anggaran), progress bar,
 * persentase + status, dan link "Lihat anggaran". Belum ada anggaran →
 * ajakan "Atur anggaran bulan ini". Aturan status/warna dari E03-US02.
 */
export function DashboardBudgetCard({
  usage,
  period,
}: DashboardBudgetCardProps) {
  const href = budgetsHref();

  if (!usage) {
    return (
      <Link
        href={href}
        data-testid="budget-setup-cta"
        className="mt-4 flex items-center gap-3 rounded-xl border border-dashed bg-card p-4 transition-colors outline-none hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <TargetIcon className="size-5" aria-hidden />
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="font-medium">{M.budgetSetup}</span>
          <span className="text-sm text-muted-foreground">
            {M.budgetSetupHint}
          </span>
        </span>
        <ChevronRightIcon
          className="size-5 shrink-0 text-muted-foreground"
          aria-hidden
        />
      </Link>
    );
  }

  const tone = BUDGET_STATUS_CLASS[usage.status].text;
  const balanceTone = budgetBalanceTone(usage.status);
  return (
    <section
      aria-labelledby="dashboard-budget-title"
      data-testid="budget-summary-card"
      data-status={BUDGET_STATUS_COLOR[usage.status]}
      className="mt-4 flex flex-col gap-2 rounded-xl border bg-card p-4"
    >
      <div className="flex items-center justify-between gap-3">
        <h2
          id="dashboard-budget-title"
          className="text-sm font-medium text-muted-foreground"
        >
          {M.budgetTitle}
        </h2>
        <Link
          href={href}
          data-testid="budget-summary-link"
          className="flex shrink-0 items-center gap-0.5 rounded-sm text-sm font-medium text-primary outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {M.budgetLink}
          <ChevronRightIcon className="size-4" aria-hidden />
        </Link>
      </div>
      <div className="flex items-end justify-between gap-3">
        <p
          data-testid="budget-summary-text"
          className="min-w-0 text-sm text-muted-foreground"
        >
          <span
            data-testid="budget-summary-spent"
            data-value={usage.spent.toString()}
            className="text-base font-semibold whitespace-nowrap text-foreground tabular-nums"
          >
            {formatRupiah(usage.spent)}
          </span>{" "}
          dari{" "}
          <span
            data-testid="budget-total"
            data-value={usage.budget.toString()}
            className="font-medium whitespace-nowrap tabular-nums"
          >
            {formatRupiah(usage.budget)}
          </span>
        </p>
        <span
          className={cn(
            "flex shrink-0 items-center gap-2 font-semibold tabular-nums",
            tone,
          )}
        >
          <BudgetStatusIcon
            status={usage.status}
            testId="budget-summary-status"
          />
          <span data-testid="budget-summary-percent">{usage.percent}%</span>
        </span>
      </div>
      <BudgetProgress
        usage={usage}
        label={`Pemakaian anggaran ${period}`}
        testId="budget-summary-progress"
      />
      <p
        data-testid="budget-summary-remaining"
        data-tone={balanceTone.tone}
        className={cn("text-sm tabular-nums", balanceTone.className)}
      >
        {budgetBalanceLabel(usage)}
      </p>
    </section>
  );
}
