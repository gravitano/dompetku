import type { Metadata } from "next";

import { TransactionsView } from "~/components/transactions/transactions-view";
import { currentMonthKey } from "~/lib/date";
import { requireUserOrRedirect } from "~/lib/session";
import { groupCategoryOptions } from "~/modules/categories/options";
import { getFilterCategories } from "~/modules/categories/queries";
import {
  getTransactionListPage,
  getTransactionListSummary,
} from "~/modules/transactions/queries";
import {
  normalizeTransactionListFilter,
  parseTransactionListParams,
} from "~/modules/transactions/schema";

export const metadata: Metadata = { title: "Transaksi" };

/**
 * Daftar transaksi dengan filter (E02-US03). Filter dibaca dari search params
 * `?month=YYYY-MM&type=expense|income&category=<id>` (lihat
 * `transactionListHref`), kategori divalidasi milik user. Ringkasan & halaman
 * pertama dirender server; halaman berikutnya lewat Server Action.
 */
export default async function Page({
  searchParams,
}: PageProps<"/transactions">) {
  const user = await requireUserOrRedirect();
  const currentMonth = currentMonthKey();
  const params = parseTransactionListParams(await searchParams, currentMonth);

  const filterCategories = await getFilterCategories(user.id);
  const filter = normalizeTransactionListFilter(params, filterCategories);
  const [summary, firstPage] = await Promise.all([
    getTransactionListSummary(user.id, filter),
    getTransactionListPage(user.id, filter),
  ]);
  // Pilihan form catat = kategori aktif (tanpa query tambahan).
  const formCategories = groupCategoryOptions(
    filterCategories
      .filter((category) => !category.archived)
      .map(({ id, name, type, icon, isDefault }) => ({
        id,
        name,
        type,
        icon,
        isDefault,
      })),
  );

  return (
    <TransactionsView
      filter={filter}
      currentMonth={currentMonth}
      filterCategories={filterCategories}
      formCategories={formCategories}
      summary={summary}
      firstPage={firstPage}
    />
  );
}
