import { Skeleton } from "~/components/ui/skeleton";

/**
 * Skeleton laporan per kategori (E04-US02 state Loading): total, lingkaran
 * donut, dan 4 baris daftar. Selector bulan tetap bisa dipakai.
 */
export function ReportSkeleton() {
  return (
    <div
      data-testid="report-skeleton"
      aria-busy="true"
      aria-label="Memuat laporan"
      className="flex flex-col gap-4 rounded-xl border bg-card p-4"
    >
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-8 w-44" />
      </div>
      <div className="flex flex-col items-center gap-6 md:flex-row md:items-start">
        <div className="flex size-56 shrink-0 items-center justify-center">
          <Skeleton className="size-52 rounded-full" />
        </div>
        <ul className="flex w-full flex-col gap-4 py-2">
          {Array.from({ length: 4 }, (_, index) => (
            <li key={index} className="flex items-center gap-3">
              <Skeleton className="size-8 shrink-0 rounded-full" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-4 w-20" />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
