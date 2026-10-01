import type { ReactNode } from "react";

import { Skeleton } from "~/components/ui/skeleton";
import { TREND_MESSAGES as M } from "~/modules/reports/trend";

/** Tinggi batang skeleton (persen) — 6 pasang, sekadar variasi visual. */
const BAR_HEIGHTS = [
  [70, 35],
  [60, 45],
  [75, 30],
  [50, 40],
  [80, 55],
  [65, 25],
] as const;

/**
 * Isi skeleton tren (E04-US03 state Loading): legenda + 6 pasang batang abu.
 * Dipakai `TrendSkeleton` (fallback Suspense) dan saat "Coba lagi" berjalan.
 */
export function TrendSkeletonBody() {
  return (
    <div
      data-testid="trend-skeleton"
      aria-busy="true"
      aria-label="Memuat tren"
      className="flex flex-col gap-4"
    >
      <div className="flex gap-4">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-24" />
      </div>
      <div className="flex h-[220px] items-end justify-around gap-2 border-b pb-1 pl-16">
        {BAR_HEIGHTS.map(([income, expense], index) => (
          <div key={index} className="flex h-full items-end gap-0.5">
            <Skeleton
              className="w-3 rounded-b-none sm:w-5"
              style={{ height: `${income}%` }}
            />
            <Skeleton
              className="w-3 rounded-b-none sm:w-5"
              style={{ height: `${expense}%` }}
            />
          </div>
        ))}
      </div>
      <Skeleton className="h-4 w-64 max-w-full" />
    </div>
  );
}

/** Kerangka seksi "Tren 6 bulan" — sama dengan `TrendSection`. */
export function TrendSectionFrame({ children }: { children: ReactNode }) {
  return (
    <section
      data-testid="reports-trend"
      aria-labelledby="reports-trend-title"
      className="flex flex-col gap-4 rounded-xl border bg-card p-4 md:p-6"
    >
      <h2 id="reports-trend-title" className="font-semibold">
        {M.title}
      </h2>
      {children}
    </section>
  );
}

/** Fallback Suspense seksi tren (state Loading). */
export function TrendSkeleton() {
  return (
    <TrendSectionFrame>
      <TrendSkeletonBody />
    </TrendSectionFrame>
  );
}
