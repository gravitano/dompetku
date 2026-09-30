import { Skeleton } from "~/components/ui/skeleton";

import { SheetHandle, TRANSACTION_SHEET_CLASS } from "./transaction-sheet";

/** Skeleton form saat membuka detail transaksi (design E02-US04 Loading). */
export function TransactionDetailSkeleton() {
  return (
    <>
      <div aria-hidden className="fixed inset-0 z-49 bg-black/10" />
      <div
        role="status"
        aria-label="Memuat detail transaksi"
        data-testid="transaction-detail-skeleton"
        className={TRANSACTION_SHEET_CLASS}
      >
        <SheetHandle />
        <div className="flex flex-col gap-3 border-b px-4 pt-4 pb-3">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="flex flex-col gap-5 px-4 py-4">
          <Skeleton className="h-12 w-full" />
          <div className="grid grid-cols-4 gap-2">
            {Array.from({ length: 8 }, (_, i) => (
              <Skeleton key={i} className="h-18" />
            ))}
          </div>
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="border-t px-4 pt-3 pb-4">
          <Skeleton className="h-11 w-full" />
        </div>
      </div>
    </>
  );
}
