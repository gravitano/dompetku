import { z } from "zod";

import { currentMonthKey } from "~/lib/date";
import { requireUserOrRedirect } from "~/lib/session";
import { categorySlug } from "~/modules/categories/options";
import { getActiveCategories } from "~/modules/categories/queries";
import { getTransactionDetail } from "~/modules/transactions/queries";
import {
  detailBackHref,
  type SearchParamsInput,
} from "~/modules/transactions/schema";

import { TransactionDetailSheet } from "./transaction-detail-sheet";

type TransactionDetailRouteProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
  /** Dirender sebagai modal di atas halaman asal (intercepting route). */
  intercepted: boolean;
};

/**
 * Detail transaksi (E02-US04) — dipakai halaman `/transactions/[id]` (tautan
 * langsung / refresh) dan intercepting route `@modal/(.)transactions/[id]`
 * (tap baris dari daftar / Beranda). Data selalu ter-scope `userId` session:
 * transaksi milik user lain / id tidak valid → "Transaksi tidak ditemukan".
 */
export async function TransactionDetailRoute({
  params,
  searchParams,
  intercepted,
}: TransactionDetailRouteProps) {
  const user = await requireUserOrRedirect();
  const { id } = await params;
  const search: SearchParamsInput = await searchParams;
  const validId = z.uuid().safeParse(id).success;

  const [transaction, categories] = await Promise.all([
    validId ? getTransactionDetail(user.id, id) : null,
    getActiveCategories(user.id),
  ]);

  // Tutup → daftar asal (filter `?from=list&...`), Beranda (`from=home`),
  // atau daftar bulan transaksi tsb.
  const backHref = detailBackHref(
    search,
    transaction ? transaction.date.slice(0, 7) : currentMonthKey(),
  );

  const category = transaction?.category;
  const archivedCategory =
    transaction && category?.archived
      ? {
          id: category.id,
          name: category.name,
          type: transaction.type,
          icon: category.icon,
          slug: categorySlug(category.name),
          isDefault: false,
          archived: true,
        }
      : undefined;

  return (
    <TransactionDetailSheet
      key={id}
      transaction={transaction}
      categories={categories}
      archivedCategory={archivedCategory}
      backHref={backHref}
      intercepted={intercepted}
    />
  );
}
