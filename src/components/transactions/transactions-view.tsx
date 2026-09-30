"use client";

import { PlusIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useOptimistic, useTransition } from "react";

import { PageHeader } from "~/components/layout/page-header";
import { Button } from "~/components/ui/button";
import { formatMonthYear, parseMonthKey } from "~/lib/date";
import type {
  CategoryOptionsByType,
  FilterCategory,
} from "~/modules/categories/options";
import type {
  TransactionListPage,
  TransactionListSummary,
} from "~/modules/transactions/list";
import {
  countActiveFilters,
  transactionListHref,
  type TransactionListFilter,
} from "~/modules/transactions/schema";

import { AddTransactionButton } from "./add-transaction-button";
import { FilterChips } from "./filter-chips";
import { MonthNavigator } from "./month-navigator";
import { PeriodSummaryCard } from "./period-summary-card";
import { TransactionFilterPanel } from "./transaction-filter-panel";
import { TransactionFormDialog } from "./transaction-form-dialog";
import { TransactionList } from "./transaction-list";
import { TransactionListSkeleton } from "./transaction-list-skeleton";
import { TransactionsEmptyState } from "./transactions-empty-state";

type TransactionsViewProps = {
  /** Filter tervalidasi dari URL (kategori sudah dipastikan milik user). */
  filter: TransactionListFilter;
  /** "YYYY-MM" bulan berjalan (Asia/Jakarta). */
  currentMonth: string;
  /** Semua kategori user termasuk terarsip (panel filter & chip). */
  filterCategories: FilterCategory[];
  /** Kategori aktif untuk form catat transaksi. */
  formCategories: CategoryOptionsByType;
  summary: TransactionListSummary;
  firstPage: TransactionListPage;
};

/**
 * Tab **Transaksi** (E02-US03). Sumber kebenaran filter adalah URL
 * (`?month=&type=&category=`), sehingga filter bertahan saat refresh/back dan
 * bisa dibuka terfilter dari halaman lain (AC 12). Mengganti bulan/filter
 * memakai `router.push` dalam transition: label bulan & chip langsung berubah
 * (optimistic), ringkasan & daftar tampil skeleton sampai data baru tiba.
 */
export function TransactionsView({
  filter,
  currentMonth,
  filterCategories,
  formCategories,
  summary,
  firstPage,
}: TransactionsViewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [shown, setShown] = useOptimistic(filter);

  function navigate(next: TransactionListFilter) {
    startTransition(() => {
      setShown(next);
      router.push(transactionListHref(next, currentMonth), { scroll: false });
    });
  }

  const resetFilter = () => navigate({ ...shown, type: null, categoryIds: [] });
  const period = formatMonthYear(parseMonthKey(shown.month));
  const filtered = countActiveFilters(filter) > 0;
  const empty = firstPage.items.length === 0;

  return (
    <div data-testid="transactions-view" aria-busy={isPending}>
      <PageHeader
        title="Transaksi"
        actions={
          <TransactionFilterPanel
            filter={shown}
            categories={filterCategories}
            onApply={(draft) => navigate({ ...shown, ...draft })}
          />
        }
      />

      <div className="flex flex-col gap-3">
        <MonthNavigator
          month={shown.month}
          currentMonth={currentMonth}
          onChange={(month) => navigate({ ...shown, month })}
        />
        <FilterChips
          filter={shown}
          categories={filterCategories}
          onRemoveType={() => navigate({ ...shown, type: null })}
          onRemoveCategory={(id) =>
            navigate({
              ...shown,
              categoryIds: shown.categoryIds.filter((other) => other !== id),
            })
          }
          onReset={resetFilter}
        />
        <PeriodSummaryCard
          period={period}
          summary={summary}
          loading={isPending}
        />
      </div>

      {isPending ? (
        <TransactionListSkeleton />
      ) : empty ? (
        <TransactionsEmptyState
          period={period}
          filtered={filtered}
          onReset={resetFilter}
          addAction={
            <TransactionFormDialog
              categories={formCategories}
              trigger={
                <Button data-testid="empty-add-transaction-button">
                  <PlusIcon aria-hidden />
                  Catat transaksi
                </Button>
              }
            />
          }
        />
      ) : (
        <TransactionList filter={filter} firstPage={firstPage} />
      )}

      <AddTransactionButton categories={formCategories} />
    </div>
  );
}
