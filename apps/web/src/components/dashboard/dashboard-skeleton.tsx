import { TransactionListSkeleton } from "~/components/transactions/transaction-list-skeleton";
import { Skeleton } from "~/components/ui/skeleton";

/**
 * Skeleton Beranda (E04-US01 state Loading): kartu ringkasan, bar anggaran,
 * dan 5 baris transaksi. Header, navigasi, dan FAB tetap bisa dipakai.
 */
export function DashboardSkeleton() {
  return (
    <div
      data-testid="dashboard-skeleton"
      aria-busy="true"
      aria-label="Memuat ringkasan"
    >
      <div className="grid grid-cols-2 gap-4 rounded-xl border bg-card p-4 md:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <div
            key={index}
            className={index === 2 ? "col-span-2 md:col-span-1" : undefined}
          >
            <Skeleton className="h-4 w-20" />
            <Skeleton className="mt-2 h-7 w-full max-w-36" />
          </div>
        ))}
      </div>
      <div className="mt-4 flex flex-col gap-3 rounded-xl border bg-card p-4">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-5 w-52" />
        <Skeleton className="h-2 w-full rounded-full" />
      </div>
      <TransactionListSkeleton rows={5} />
    </div>
  );
}
