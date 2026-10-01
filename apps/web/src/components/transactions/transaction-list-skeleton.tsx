import { Skeleton } from "~/components/ui/skeleton";

/** Skeleton 5 baris daftar transaksi (E02-US03 state Loading). */
export function TransactionListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div
      data-testid="transaction-list-skeleton"
      aria-busy
      aria-label="Memuat transaksi"
      className="mt-4 flex flex-col gap-2"
    >
      <Skeleton className="h-4 w-40" />
      <ul className="divide-y rounded-xl border bg-card">
        {Array.from({ length: rows }, (_, index) => (
          <li key={index} className="flex items-center gap-3 px-4 py-3">
            <Skeleton className="size-9 shrink-0 rounded-full" />
            <div className="flex flex-1 flex-col gap-1.5">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-3 w-1/3" />
            </div>
            <Skeleton className="h-4 w-20" />
          </li>
        ))}
      </ul>
    </div>
  );
}
