import { BudgetsSkeleton } from "~/components/budgets/budgets-skeleton";
import { Skeleton } from "~/components/ui/skeleton";

/** Skeleton halaman Anggaran (E03-US01 state Loading). */
export default function Loading() {
  return (
    <div aria-busy="true">
      <Skeleton className="mb-4 h-8 w-32" />
      <Skeleton className="mx-auto mb-3 h-10 w-64" />
      <BudgetsSkeleton />
    </div>
  );
}
