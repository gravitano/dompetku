import type { ReactNode } from "react";

import { RecentTransactions } from "~/components/transactions/recent-transactions";
import { formatMonthYear } from "~/lib/date";
import type { CategoryOptionsByType } from "~/modules/categories/options";
import type { DashboardView as DashboardData } from "~/modules/dashboard/view";
import { transactionListHref } from "~/modules/transactions/schema";

import { DashboardBudgetCard } from "./dashboard-budget-card";
import { DashboardEmptyState } from "./dashboard-empty-state";
import { DashboardSummaryCard } from "./dashboard-summary-card";

type DashboardViewProps = {
  data: DashboardData;
  /** Kategori aktif (form catat pengeluaran dari empty state). */
  categories: CategoryOptionsByType;
  /**
   * Slot banner peringatan anggaran di atas kartu ringkasan (E04-US01 AC 4a);
   * banner-nya milik E03-US03. Tidak dirender bila kosong.
   */
  alerts?: ReactNode;
};

/**
 * Isi Beranda (E04-US01): [banner peringatan] → kartu ringkasan → ringkasan
 * anggaran / ajakan → 5 transaksi terbaru + "Lihat semua" (atau empty state
 * pengguna baru).
 */
export function DashboardView({
  data,
  categories,
  alerts,
}: DashboardViewProps) {
  const period = formatMonthYear(data.month);
  return (
    <>
      {alerts ? (
        <div
          data-testid="dashboard-alerts"
          className="mb-4 flex flex-col gap-2"
        >
          {alerts}
        </div>
      ) : null}
      <DashboardSummaryCard
        period={period}
        income={data.income}
        expense={data.expense}
        net={data.net}
        netState={data.netState}
      />
      <DashboardBudgetCard usage={data.budget} period={period} />
      {data.isNewUser ? (
        <DashboardEmptyState categories={categories} />
      ) : (
        <RecentTransactions
          transactions={data.recent}
          seeAllHref={transactionListHref({})}
        />
      )}
    </>
  );
}
