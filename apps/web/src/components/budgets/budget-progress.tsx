import { cn } from "~/lib/utils";
import {
  BUDGET_STATUS_LABEL,
  type BudgetUsage,
} from "~/modules/budgets/status";

import { BUDGET_STATUS_CLASS } from "./budget-status";

/**
 * Progress bar pemakaian anggaran (E03-US02): warna sesuai status, penuh bila
 * terlampaui. Dipakai baris kategori dan kartu ringkasan (juga Beranda
 * E04-US01).
 */
export function BudgetProgress({
  usage,
  label,
  testId,
  className,
}: {
  usage: BudgetUsage;
  /** Nama yang dibacakan pembaca layar, mis. "Pemakaian anggaran Belanja". */
  label: string;
  testId?: string;
  className?: string;
}) {
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.min(usage.percent, 100)}
      aria-valuetext={`${usage.percent}%, ${BUDGET_STATUS_LABEL[usage.status]}`}
      data-testid={testId}
      data-value={usage.barPercent}
      className={cn(
        "h-2 w-full overflow-hidden rounded-full bg-muted",
        className,
      )}
    >
      <div
        className={cn(
          "h-full rounded-full transition-[width]",
          BUDGET_STATUS_CLASS[usage.status].bar,
        )}
        style={{ width: `${usage.barPercent}%` }}
      />
    </div>
  );
}
