import { TransactionDetailRoute } from "~/components/transactions/transaction-detail-route";

/**
 * Detail transaksi sebagai modal (E02-US04 AC 1): tap baris di tab Transaksi
 * atau Beranda membuka sheet/dialog di atas halaman asal; URL tetap
 * `/transactions/<id>` sehingga bisa dibagikan / di-refresh.
 */
export default function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <TransactionDetailRoute
      params={params}
      searchParams={searchParams}
      intercepted
    />
  );
}
