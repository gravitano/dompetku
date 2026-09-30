import type { Metadata } from "next";

import { PageHeader } from "~/components/layout/page-header";
import { AddTransactionButton } from "~/components/transactions/add-transaction-button";
import { RecentTransactions } from "~/components/transactions/recent-transactions";
import { requireUserOrRedirect } from "~/lib/session";
import { getActiveCategories } from "~/modules/categories/queries";
import { getRecentTransactions } from "~/modules/transactions/queries";

export const metadata: Metadata = { title: "Transaksi" };

/**
 * Daftar transaksi versi minimal (E02-US01) + FAB catat. Filter periode &
 * kategori serta pengelompokan per tanggal menyusul di E02-US03.
 */
export default async function Page() {
  const user = await requireUserOrRedirect();
  const [transactions, categories] = await Promise.all([
    getRecentTransactions(user.id, 20),
    getActiveCategories(user.id),
  ]);

  return (
    <>
      <PageHeader title="Transaksi" />
      <RecentTransactions transactions={transactions} />
      <AddTransactionButton categories={categories} />
    </>
  );
}
