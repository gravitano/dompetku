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
import { budgetAttention } from "~/modules/budgets/alerts";
import {
  BUDGET_MESSAGES as M,
  BUDGET_MONTH_MIN,
  budgetMaxMonth,
  budgetsHref,
  isBudgetMonthEditable,
} from "~/modules/budgets/schema";
import {
  BUDGET_STATUS_COLOR,
  budgetBalanceLabel,
} from "~/modules/budgets/status";
import type {
  BudgetedRow,
  BudgetMonthView,
  BudgetRow,
} from "~/modules/budgets/view";

import { BudgetPageAlertBanner } from "./budget-alert-banner";
import { BudgetFormSheet } from "./budget-form-sheet";
import { BudgetProgress } from "./budget-progress";
import {
  BUDGET_STATUS_CLASS,
  budgetBalanceTone,
  BudgetStatusIcon,
} from "./budget-status";
import { BudgetSummaryCard } from "./budget-summary-card";
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
 * Tab **Anggaran** (E03-US01 + indikator E03-US02): navigasi bulan (bulan lampau
 * "Hanya lihat", maksimal +1 bulan), kartu ringkasan terpakai vs total anggaran,
 * kartu kosong + "Salin dari bulan lalu", lalu tiga bagian: kategori
 * beranggaran dengan indikator (persentase tertinggi dulu, tap → form Atur
 * Anggaran), "Tanpa anggaran" (ada pengeluaran, tombol Atur anggaran), dan
 * "Belum diatur". Kategori terarsip tampil read-only. Bulan tersimpan di URL
 * (`?month=`); setiap mutasi (anggaran/transaksi) me-revalidate halaman.
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
  const { budgeted, unbudgeted, notSet } = data.sections;
  // Banner peringatan hanya untuk bulan berjalan (E03-US03 AC 9, UX-04).
  const attention =
    data.month === currentMonth
      ? budgetAttention(
          budgeted.map((row) => ({
            name: row.name,
            spent: row.usage.spent,
            budget: row.usage.budget,
          })),
        )
      : null;

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
            {attention ? <BudgetPageAlertBanner attention={attention} /> : null}

            <BudgetSummaryCard
              totalBudget={data.total}
              totalSpent={data.totalSpent}
              budgetCount={data.budgetCount}
              period={period}
            />

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

            {budgeted.length > 0 ? (
              <ul
                data-testid="budget-list"
                aria-label={`Pemakaian anggaran per kategori, ${period}`}
                className="divide-y overflow-hidden rounded-xl border bg-card"
              >
                {budgeted.map((row) => (
                  <li key={row.categoryId}>
                    <BudgetRowItem
                      row={row}
                      readOnly={!editable || row.archived}
                      onOpen={() => openForm(row)}
                    />
                  </li>
                ))}
              </ul>
            ) : null}

            {unbudgeted.length > 0 ? (
              <section
                data-testid="budget-unbudgeted-section"
                aria-labelledby="budget-unbudgeted-title"
                className="flex flex-col gap-2"
              >
                <h2
                  id="budget-unbudgeted-title"
                  className="px-1 text-sm font-semibold text-muted-foreground"
                >
                  {M.unbudgetedTitle}
                </h2>
                <ul className="divide-y overflow-hidden rounded-xl border bg-card">
                  {unbudgeted.map((row) => (
                    <li key={row.categoryId}>
                      <UnbudgetedRowItem
                        row={row}
                        canSet={editable && !row.archived}
                        onSet={() => openForm(row)}
                      />
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {notSet.length > 0 ? (
              <section
                data-testid="budget-notset-section"
                aria-label={`${M.notSetTitle}, ${period}`}
                className="flex flex-col gap-2"
              >
                {budgeted.length + unbudgeted.length > 0 ? (
                  <h2
                    aria-hidden
                    className="px-1 text-sm font-semibold text-muted-foreground"
                  >
                    {M.notSetTitle}
                  </h2>
                ) : null}
                <ul className="divide-y overflow-hidden rounded-xl border bg-card">
                  {notSet.map((row) => (
                    <li key={row.categoryId}>
                      <BudgetRowItem
                        row={row}
                        readOnly={!editable || row.archived}
                        onOpen={() => openForm(row)}
                      />
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
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

function RowIcon({ row }: { row: BudgetRow }) {
  return (
    <span
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground",
        row.archived && "opacity-60",
      )}
    >
      <CategoryIcon icon={row.icon} />
    </span>
  );
}

function RowName({ row }: { row: BudgetRow }) {
  return (
    <span
      data-testid="budget-row-name"
      className={cn(
        "min-w-0 truncate font-medium",
        row.archived && "opacity-60",
      )}
    >
      {row.name}
    </span>
  );
}

function ArchivedLabel({ row }: { row: BudgetRow }) {
  return row.archived ? (
    <span
      data-testid={`budget-row-${row.slug}-archived`}
      className="shrink-0 text-xs text-muted-foreground"
    >
      {M.archived}
    </span>
  ) : null;
}

/** Isi baris beranggaran + indikator pemakaian (E03-US02 UX-02). */
function BudgetedRowContent({ row }: { row: BudgetedRow }) {
  const { usage } = row;
  const tone = BUDGET_STATUS_CLASS[usage.status].text;
  const balanceTone = budgetBalanceTone(usage.status);
  return (
    <span className="flex min-w-0 flex-1 flex-col gap-1.5">
      <span className="flex min-w-0 items-center gap-2">
        <RowName row={row} />
        <ArchivedLabel row={row} />
        <span className="ml-auto flex shrink-0 items-center gap-2">
          <BudgetStatusIcon
            status={usage.status}
            testId={`budget-row-${row.slug}-status`}
          />
          <span
            data-testid={`budget-row-${row.slug}-percent`}
            className={cn("font-semibold tabular-nums", tone)}
          >
            {usage.percent}%
          </span>
        </span>
      </span>
      <BudgetProgress
        usage={usage}
        label={`Pemakaian anggaran ${row.name}`}
        testId={`budget-row-${row.slug}-progress`}
      />
      <span className="flex flex-wrap items-center justify-between gap-x-3 text-xs text-muted-foreground tabular-nums">
        <span>
          <span data-testid={`budget-row-${row.slug}-spent`}>
            {formatRupiah(usage.spent)}
          </span>{" "}
          /{" "}
          <span data-testid={`budget-row-${row.slug}-amount`}>
            {formatRupiah(row.amount)}
          </span>
        </span>
        <span
          data-testid={`budget-row-${row.slug}-remaining`}
          data-tone={balanceTone.tone}
          className={balanceTone.className}
        >
          {budgetBalanceLabel(usage)}
        </span>
      </span>
    </span>
  );
}

/** Isi baris "Belum diatur" (E03-US01). */
function NotSetRowContent({ row }: { row: BudgetRow }) {
  return (
    <>
      <span className="flex min-w-0 flex-1 flex-col">
        <RowName row={row} />
        <ArchivedLabel row={row} />
      </span>
      <span
        data-testid={`budget-row-${row.slug}-amount`}
        className="shrink-0 text-sm text-muted-foreground tabular-nums"
      >
        {M.notSet}
      </span>
    </>
  );
}

/**
 * Baris kategori: beranggaran (indikator) atau "Belum diatur". Bisa ditap
 * untuk membuka form Atur Anggaran kecuali `readOnly` (bulan lampau / kategori
 * terarsip).
 */
function BudgetRowItem({
  row,
  readOnly,
  onOpen,
}: {
  row: BudgetRow | BudgetedRow;
  readOnly: boolean;
  onOpen: () => void;
}) {
  const budgeted = "usage" in row ? row : null;
  const content = (
    <>
      <RowIcon row={row} />
      {budgeted ? (
        <BudgetedRowContent row={budgeted} />
      ) : (
        <NotSetRowContent row={row} />
      )}
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
    "data-status": budgeted
      ? BUDGET_STATUS_COLOR[budgeted.usage.status]
      : undefined,
    "data-percent": budgeted ? budgeted.usage.percent : undefined,
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

/**
 * Baris bagian "Tanpa anggaran" (E03-US02 UX-03): pengeluaran kategori tanpa
 * anggaran + tombol "Atur anggaran" (bulan berjalan/depan, kategori aktif).
 */
function UnbudgetedRowItem({
  row,
  canSet,
  onSet,
}: {
  row: BudgetRow;
  canSet: boolean;
  onSet: () => void;
}) {
  return (
    <div
      data-testid={`budget-row-${row.slug}`}
      data-budget-set="false"
      data-archived={row.archived}
      data-readonly={!canSet}
      className="flex w-full items-center gap-3 px-3 py-3"
    >
      <RowIcon row={row} />
      <span className="flex min-w-0 flex-1 flex-col">
        <RowName row={row} />
        <ArchivedLabel row={row} />
      </span>
      <span
        data-testid={`budget-row-${row.slug}-spent`}
        className="shrink-0 font-semibold tabular-nums"
      >
        {formatRupiah(row.spent)}
      </span>
      {canSet ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          data-testid={`budget-unbudgeted-set-${row.slug}`}
          aria-label={`${M.setBudget} ${row.name}`}
          className="shrink-0"
          onClick={onSet}
        >
          {M.setBudget}
        </Button>
      ) : null}
    </div>
  );
}
