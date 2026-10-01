import { OctagonXIcon, TriangleAlertIcon } from "lucide-react";

import { cn } from "~/lib/utils";
import {
  BUDGET_STATUS_LABEL,
  type BudgetStatus,
} from "~/modules/budgets/status";

/** Kelas warna per status (token `--budget-*` di `globals.css`). */
export const BUDGET_STATUS_CLASS: Record<
  BudgetStatus,
  { bar: string; text: string }
> = {
  safe: { bar: "bg-budget-safe", text: "text-budget-safe-text" },
  warning: { bar: "bg-budget-warning", text: "text-budget-warning-text" },
  over: { bar: "bg-budget-over", text: "text-budget-over-text" },
};

/**
 * Penanda status selain warna (E03-US02 aksesibilitas): ikon ⚠ (Hampir habis) /
 * ⛔ (Terlampaui) + label status untuk pembaca layar. Status Aman hanya label
 * tersembunyi.
 */
export function BudgetStatusIcon({
  status,
  className,
  testId,
}: {
  status: BudgetStatus;
  className?: string;
  testId?: string;
}) {
  const Icon =
    status === "over"
      ? OctagonXIcon
      : status === "warning"
        ? TriangleAlertIcon
        : null;
  return (
    <span
      data-testid={testId}
      data-status-label={BUDGET_STATUS_LABEL[status]}
      title={BUDGET_STATUS_LABEL[status]}
      className={cn(
        Icon ? "inline-flex shrink-0 items-center" : "sr-only",
        BUDGET_STATUS_CLASS[status].text,
        className,
      )}
    >
      {Icon ? <Icon className="size-4" aria-hidden /> : null}
      <span className="sr-only">{BUDGET_STATUS_LABEL[status]}</span>
    </span>
  );
}
