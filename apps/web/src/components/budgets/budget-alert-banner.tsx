import {
  ChevronRightIcon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react";
import Link from "next/link";

import { cn } from "~/lib/utils";
import {
  budgetAttentionLevel,
  budgetAttentionSummary,
  type BudgetAlertLevel,
  type BudgetAttention,
} from "~/modules/budgets/alerts";
import { budgetsHref } from "~/modules/budgets/schema";
import { BUDGET_STATUS_LABEL } from "~/modules/budgets/status";

/** Warna banner/toast per level (token `--budget-*`, light & dark). */
export const BUDGET_ALERT_TONE: Record<BudgetAlertLevel, string> = {
  warning:
    "border-budget-warning/50 bg-budget-warning/10 text-budget-warning-text",
  over: "border-budget-over/50 bg-budget-over/10 text-budget-over-text",
};

export function BudgetAlertIcon({
  level,
  className,
}: {
  level: BudgetAlertLevel;
  className?: string;
}) {
  const Icon = level === "over" ? OctagonXIcon : TriangleAlertIcon;
  return <Icon className={cn("size-5 shrink-0", className)} aria-hidden />;
}

/**
 * Banner Beranda (E03-US03 UX-03): jumlah kategori Terlampaui / Hampir habis
 * bulan berjalan, ditap → halaman Anggaran. Merah bila ada yang Terlampaui,
 * kuning bila hanya Hampir habis. Tidak bisa ditutup — hilang sendiri saat
 * tidak ada lagi kategori ≥ 80% (keputusan MVP).
 */
export function HomeBudgetAlertBanner({
  attention,
}: {
  attention: BudgetAttention;
}) {
  const level = budgetAttentionLevel(attention);
  return (
    <Link
      href={budgetsHref()}
      data-testid="home-budget-alert-banner"
      data-level={level}
      className={cn(
        "flex items-center gap-3 rounded-xl border p-3 text-sm font-medium transition-colors outline-none hover:brightness-95 focus-visible:ring-3 focus-visible:ring-ring/50",
        BUDGET_ALERT_TONE[level],
      )}
    >
      <BudgetAlertIcon level={level} />
      <span className="min-w-0 flex-1 text-foreground">
        {budgetAttentionSummary(attention)}
      </span>
      <ChevronRightIcon className="size-5 shrink-0" aria-hidden />
    </Link>
  );
}

/**
 * Banner halaman Anggaran bulan berjalan (E03-US03 UX-04): nama kategori per
 * status, di atas kartu ringkasan.
 */
export function BudgetPageAlertBanner({
  attention,
}: {
  attention: BudgetAttention;
}) {
  const level = budgetAttentionLevel(attention);
  const lines = (
    [
      ["over", attention.over],
      ["warning", attention.warning],
    ] as const
  ).filter(([, names]) => names.length > 0);
  return (
    <section
      data-testid="budget-page-alert-banner"
      data-level={level}
      aria-label="Kategori yang perlu perhatian"
      className={cn(
        "flex flex-col gap-1.5 rounded-xl border p-3 text-sm",
        BUDGET_ALERT_TONE[level],
      )}
    >
      {lines.map(([status, names]) => (
        <p
          key={status}
          data-testid={`budget-page-alert-${status}`}
          className="flex items-start gap-2"
        >
          <BudgetAlertIcon level={status} className="mt-px size-4" />
          <span className="min-w-0 text-foreground">
            <span className="font-semibold">
              {BUDGET_STATUS_LABEL[status]}:
            </span>{" "}
            {names.join(" · ")}
          </span>
        </p>
      ))}
    </section>
  );
}
