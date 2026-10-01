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
 * Warna teks "Sisa Rp X" / "Lebih Rp X": mengikuti status (Hampir habis kuning,
 * Terlampaui merah — termasuk tepat 100% "Sisa Rp 0"), netral bila Aman.
 * `tone` dipakai sebagai `data-tone` (asersi E2E).
 */
export function budgetBalanceTone(status: BudgetStatus): {
  tone: "muted" | "yellow" | "red";
  className: string;
} {
  if (status === "safe") {
    return { tone: "muted", className: "text-muted-foreground" };
  }
  return {
    tone: status === "over" ? "red" : "yellow",
    className: cn("font-medium", BUDGET_STATUS_CLASS[status].text),
  };
}

/**
 * Penanda status selain warna (E03-US02 aksesibilitas, design: ikon DAN
 * teks): ikon ⚠ (Hampir habis) / ⛔ (Terlampaui) + label status yang terlihat
 * (`showLabel`, default) — atau hanya untuk pembaca layar bila ruang sempit.
 * Status Aman hanya label tersembunyi.
 */
export function BudgetStatusIcon({
  status,
  className,
  testId,
  showLabel = true,
}: {
  status: BudgetStatus;
  className?: string;
  testId?: string;
  showLabel?: boolean;
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
        Icon ? "inline-flex shrink-0 items-center gap-1" : "sr-only",
        BUDGET_STATUS_CLASS[status].text,
        className,
      )}
    >
      {Icon ? <Icon className="size-4 shrink-0" aria-hidden /> : null}
      <span
        data-testid={testId ? `${testId}-label` : undefined}
        className={
          Icon && showLabel
            ? "text-xs font-medium whitespace-nowrap"
            : "sr-only"
        }
      >
        {BUDGET_STATUS_LABEL[status]}
      </span>
    </span>
  );
}
