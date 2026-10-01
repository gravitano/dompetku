"use client";

import { CircleAlertIcon } from "lucide-react";

import { PageHeader } from "~/components/layout/page-header";
import { Button } from "~/components/ui/button";
import { BUDGET_MESSAGES as M } from "~/modules/budgets/schema";

/** Gagal memuat tab Anggaran (E03-US02 state Error): pesan + "Coba lagi". */
export default function BudgetsError({
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <>
      <PageHeader title="Anggaran" />
      <div
        role="alert"
        data-testid="budget-load-error"
        className="flex flex-col items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-10 text-center text-sm text-destructive md:max-w-2xl"
      >
        <CircleAlertIcon className="size-6" aria-hidden />
        <p>{M.loadError}</p>
        <Button
          variant="outline"
          data-testid="budget-retry-button"
          onClick={() => retry()}
        >
          {M.retry}
        </Button>
      </div>
    </>
  );
}
