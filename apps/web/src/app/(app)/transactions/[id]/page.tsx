import type { Metadata } from "next";

import { TransactionDetailRoute } from "~/components/transactions/transaction-detail-route";

export const metadata: Metadata = { title: "Detail Transaksi" };

/**
 * Detail transaksi via tautan langsung / refresh (E02-US04). Tap baris dari
 * daftar atau Beranda ditangani intercepting route
 * `src/app/(app)/@modal/(.)transactions/[id]` (modal di atas halaman asal).
 */
export default function Page({
  params,
  searchParams,
}: PageProps<"/transactions/[id]">) {
  return (
    <TransactionDetailRoute
      params={params}
      searchParams={searchParams}
      intercepted={false}
    />
  );
}
