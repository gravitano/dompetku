import type { Metadata } from "next";

import { PageHeader } from "~/components/layout/page-header";
import { AddTransactionButton } from "~/components/transactions/add-transaction-button";
import { ExpenseSummaryCard } from "~/components/transactions/expense-summary-card";
import { RecentTransactions } from "~/components/transactions/recent-transactions";
import { formatMonthYear } from "~/lib/date";
import { requireUserOrRedirect } from "~/lib/session";
import { getActiveCategories } from "~/modules/categories/queries";
import {
  getMonthTotals,
  getRecentTransactions,
} from "~/modules/transactions/queries";

export const metadata: Metadata = { title: "Beranda" };

/**
 * Beranda versi minimal (E02-US01): total pengeluaran bulan berjalan +
 * transaksi terbaru + FAB catat. Dashboard lengkap menyusul di E04-US01.
 */
export default async function Page() {
  const user = await requireUserOrRedirect();
  const [totals, transactions, categories] = await Promise.all([
    getMonthTotals(user.id),
    getRecentTransactions(user.id, 5),
    getActiveCategories(user.id),
  ]);

  return (
    <>
      <PageHeader title="Beranda" description={formatMonthYear(totals.month)} />
      <ExpenseSummaryCard month={totals.month} expense={totals.expense} />
      <RecentTransactions transactions={transactions} />
      <AddTransactionButton categories={categories} />
    </>
  );
}
