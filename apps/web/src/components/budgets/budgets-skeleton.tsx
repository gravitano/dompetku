import { Skeleton } from "~/components/ui/skeleton";

/** Skeleton kartu total + daftar kategori (E03-US01 state Loading). */
export function BudgetsSkeleton({ rows = 7 }: { rows?: number }) {
  return (
    <div
      data-testid="budgets-skeleton"
      aria-busy
      aria-label="Memuat anggaran"
      className="flex flex-col gap-4"
    >
      <Skeleton className="h-20 w-full rounded-xl" />
      <ul className="divide-y rounded-xl border bg-card">
        {Array.from({ length: rows }, (_, index) => (
          <li key={index} className="flex items-center gap-3 px-3 py-3">
            <Skeleton className="size-9 shrink-0 rounded-full" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 w-24" />
          </li>
        ))}
      </ul>
    </div>
  );
}
