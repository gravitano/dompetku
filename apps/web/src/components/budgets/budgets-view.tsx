"use client";

import {
  ChevronRightIcon,
  CopyIcon,
  EyeIcon,
  LoaderCircleIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useOptimistic, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { CategoryIcon } from "~/components/categories/category-icon";
import { PageHeader } from "~/components/layout/page-header";
import { MonthNavigator } from "~/components/transactions/month-navigator";
import { Button } from "~/components/ui/button";
import { formatMonthYear, parseMonthKey, shiftMonthKey } from "~/lib/date";
import { formatRupiah } from "~/lib/format";
import { cn } from "~/lib/utils";
import { copyPreviousBudgetsAction } from "~/modules/budgets/actions";
import {
  BUDGET_MESSAGES as M,
  BUDGET_MONTH_MIN,
  budgetMaxMonth,
  budgetsHref,
  isBudgetMonthEditable,
} from "~/modules/budgets/schema";
import type { BudgetMonthView, BudgetRow } from "~/modules/budgets/view";

import { BudgetFormSheet } from "./budget-form-sheet";
import { BudgetsSkeleton } from "./budgets-skeleton";

type BudgetsViewProps = {
  data: BudgetMonthView;
  /** "YYYY-MM" bulan berjalan menurut jam server (Asia/Jakarta). */
  currentMonth: string;
};

const MONTH_TEST_IDS = {
  root: "budget-month-navigator",
  prev: "budget-month-prev",
  label: "budget-month-label",
  next: "budget-month-next",
};

/** "Okt 2026" untuk tombol salin. */
function shortMonthLabel(month: string): string {
  const date = parseMonthKey(month);
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "UTC",
    month: "short",
    year: "numeric",
  }).format(date);
}

/**
 * Tab **Anggaran** (E03-US01): navigasi bulan (bulan lampau "Hanya lihat",
 * maksimal +1 bulan), kartu Total anggaran, kartu kosong + "Salin dari bulan
 * lalu", dan daftar kategori pengeluaran aktif (tap → form Atur Anggaran).
 * Kategori terarsip yang masih punya anggaran bulan tsb tampil read-only.
 * Bulan tersimpan di URL (`?month=`); setiap mutasi me-revalidate halaman.
 */
export function BudgetsView({ data, currentMonth }: BudgetsViewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [shownMonth, setShownMonth] = useOptimistic(data.month);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selected, setSelected] = useState<BudgetRow | null>(null);
  /** Naik setiap form dibuka agar form selalu mulai dari data terbaru. */
  const [session, setSession] = useState(0);
  const [copying, setCopying] = useState(false);
  const copyingRef = useRef(false);

  const editable = isBudgetMonthEditable(data.month, currentMonth);
  const shownEditable = isBudgetMonthEditable(shownMonth, currentMonth);
  const period = formatMonthYear(parseMonthKey(data.month));
  const previousMonth = shiftMonthKey(data.month, -1);
  const empty = data.budgetCount === 0;
  const canCopy = editable && empty && data.copyableFromPrevious > 0;

  function navigate(month: string) {
    startTransition(() => {
      setShownMonth(month);
      router.push(budgetsHref(month, currentMonth), { scroll: false });
    });
  }

  function openForm(row: BudgetRow) {
    if (!editable || row.archived) return;
    setSelected(row);
    setSession((value) => value + 1);
    setSheetOpen(true);
  }

  async function copyPrevious() {
    if (copyingRef.current) return;
    copyingRef.current = true;
    setCopying(true);
    let message: string | null = null;
    try {
      const result = await copyPreviousBudgetsAction({ month: data.month });
      if (!result.success) {
        message =
          result.error.code === "INTERNAL_ERROR"
            ? M.copyError
            : result.error.message;
      }
    } catch {
      message = M.copyError;
    }
    copyingRef.current = false;
    setCopying(false);
    if (message) {
      toast.error(message, { id: "budget-copy-error" });
    } else {
      toast.success(M.copied(formatMonthYear(parseMonthKey(previousMonth))), {
        duration: 3000,
      });
    }
  }

  return (
    <div
      data-testid="budgets-page"
      data-month={data.month}
      data-editable={editable}
      aria-busy={isPending}
    >
      <PageHeader title="Anggaran" />

      <div className="flex flex-col gap-4 md:max-w-2xl">
        <MonthNavigator
          month={shownMonth}
          currentMonth={currentMonth}
          maxMonth={budgetMaxMonth(currentMonth)}
          minMonth={BUDGET_MONTH_MIN}
          testIds={MONTH_TEST_IDS}
          onChange={navigate}
        >
          {shownEditable ? null : (
            <span
              data-testid="budget-readonly-label"
              className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"
            >
              <EyeIcon className="size-3" aria-hidden />
              {M.readOnly}
            </span>
          )}
        </MonthNavigator>

        {isPending ? (
          <BudgetsSkeleton rows={Math.max(data.rows.length, 3)} />
        ) : (
          <>
            <section
              aria-label={`${M.totalLabel} ${period}`}
              className="rounded-xl border bg-card p-4"
            >
              <p className="text-sm text-muted-foreground">
                {M.totalLabel}
                <span className="sr-only">, {period}</span>
              </p>
              <p
                data-testid="budget-total"
                data-value={data.total.toString()}
                className="mt-1 truncate text-2xl font-semibold tabular-nums"
              >
                {formatRupiah(data.total)}
              </p>
            </section>

            {empty ? (
              <section
                data-testid="budget-empty-state"
                className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-4 py-5 text-center"
              >
                <p className="font-medium">{M.empty}</p>
                {canCopy ? (
                  <>
                    <Button
                      size="lg"
                      data-testid="budget-copy-previous-button"
                      className="h-11 w-full max-w-sm"
                      disabled={copying}
                      aria-busy={copying}
                      onClick={() => void copyPrevious()}
                    >
                      {copying ? (
                        <LoaderCircleIcon
                          className="animate-spin"
                          aria-hidden
                        />
                      ) : (
                        <CopyIcon aria-hidden />
                      )}
                      {M.copyButton} ({shortMonthLabel(previousMonth)})
                    </Button>
                    <p className="text-sm text-muted-foreground">
                      {M.emptyHintCopy}
                    </p>
                  </>
                ) : editable ? (
                  <p className="text-sm text-muted-foreground">{M.emptyHint}</p>
                ) : null}
              </section>
            ) : null}

            <ul
              data-testid="budget-list"
              aria-label={`Anggaran per kategori, ${period}`}
              className="divide-y overflow-hidden rounded-xl border bg-card"
            >
              {data.rows.map((row) => (
                <li key={row.categoryId}>
                  <BudgetRowItem
                    row={row}
                    readOnly={!editable || row.archived}
                    onOpen={() => openForm(row)}
                  />
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      <BudgetFormSheet
        key={session}
        open={sheetOpen}
        month={data.month}
        row={selected}
        onClose={() => setSheetOpen(false)}
        onDone={(message) => {
          setSheetOpen(false);
          toast.success(message, { duration: 3000 });
        }}
      />
    </div>
  );
}

function BudgetRowItem({
  row,
  readOnly,
  onOpen,
}: {
  row: BudgetRow;
  readOnly: boolean;
  onOpen: () => void;
}) {
  const content = (
    <>
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground",
          row.archived && "opacity-60",
        )}
      >
        <CategoryIcon icon={row.icon} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span
          data-testid="budget-row-name"
          className={cn("truncate font-medium", row.archived && "opacity-60")}
        >
          {row.name}
        </span>
        {row.archived ? (
          <span
            data-testid={`budget-row-${row.slug}-archived`}
            className="text-xs text-muted-foreground"
          >
            {M.archived}
          </span>
        ) : null}
      </span>
      <span
        data-testid={`budget-row-${row.slug}-amount`}
        className={cn(
          "shrink-0 tabular-nums",
          row.amount === null
            ? "text-sm text-muted-foreground"
            : "font-semibold",
        )}
      >
        {row.amount === null ? M.notSet : formatRupiah(row.amount)}
      </span>
      {readOnly ? null : (
        <ChevronRightIcon
          className="size-4 shrink-0 text-muted-foreground"
          aria-hidden
        />
      )}
    </>
  );

  const shared = {
    "data-testid": `budget-row-${row.slug}`,
    "data-budget-set": row.amount !== null,
    "data-archived": row.archived,
    "data-readonly": readOnly,
    className: "flex w-full items-center gap-3 px-3 py-3 text-left",
  };

  if (readOnly) {
    return (
      <div {...shared} aria-disabled="true">
        {content}
      </div>
    );
  }
  return (
    <button
      type="button"
      {...shared}
      onClick={onOpen}
      className={cn(
        shared.className,
        "transition-colors outline-none hover:bg-muted/60 focus-visible:bg-muted/60",
      )}
    >
      {content}
    </button>
  );
}
