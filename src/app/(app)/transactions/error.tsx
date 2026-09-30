"use client";

import { CircleAlertIcon } from "lucide-react";

import { PageHeader } from "~/components/layout/page-header";
import { Button } from "~/components/ui/button";
import { TRANSACTION_LIST_MESSAGES as M } from "~/modules/transactions/schema";

/** Gagal memuat tab Transaksi (E02-US03 state Error): pesan + "Coba lagi". */
export default function TransactionsError({
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <>
      <PageHeader title="Transaksi" />
      <div
        role="alert"
        data-testid="transactions-load-error"
        className="flex flex-col items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-10 text-center text-sm text-destructive"
      >
        <CircleAlertIcon className="size-6" aria-hidden />
        <p>{M.loadError}</p>
        <Button
          variant="outline"
          data-testid="transactions-retry-button"
          onClick={() => retry()}
        >
          {M.retry}
        </Button>
      </div>
    </>
  );
}
