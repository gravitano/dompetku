import { Skeleton } from "~/components/ui/skeleton";

/**
 * Skeleton kartu ringkasan + baris kategori dengan progress bar (state Loading
 * E03-US01/E03-US02).
 */
export function BudgetsSkeleton({ rows = 7 }: { rows?: number }) {
  return (
    <div
      data-testid="budgets-skeleton"
      aria-busy
      aria-label="Memuat anggaran"
      className="flex flex-col gap-4"
    >
      <div className="flex flex-col gap-3 rounded-xl border bg-card p-4">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-2 w-full rounded-full" />
        <Skeleton className="h-4 w-28" />
      </div>
      <ul className="divide-y rounded-xl border bg-card">
        {Array.from({ length: rows }, (_, index) => (
          <li key={index} className="flex items-center gap-3 px-3 py-3">
            <Skeleton className="size-9 shrink-0 rounded-full" />
            <span className="flex flex-1 flex-col gap-2">
              <span className="flex justify-between gap-3">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-10" />
              </span>
              <Skeleton className="h-2 w-full rounded-full" />
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
