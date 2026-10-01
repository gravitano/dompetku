import { Skeleton } from "~/components/ui/skeleton";

/** Skeleton daftar kategori (E02-US05 state Loading). */
export default function Loading() {
  return (
    <div data-testid="categories-skeleton" aria-busy="true">
      <Skeleton className="mb-1 h-8 w-32" />
      <Skeleton className="mb-4 h-4 w-64" />
      <Skeleton className="mb-4 h-11 w-full md:max-w-sm" />
      <div className="flex flex-col gap-4 md:max-w-2xl">
        <Skeleton className="h-11 w-full" />
        <div className="flex flex-col divide-y rounded-xl border">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="flex items-center gap-3 px-3 py-3">
              <Skeleton className="size-9 rounded-full" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-3 w-16" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
