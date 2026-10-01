"use client";

import { CircleAlertIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { Button } from "~/components/ui/button";
import { REPORT_MESSAGES as M } from "~/modules/reports/view";

import { ReportSkeleton } from "./report-skeleton";

/**
 * Gagal memuat laporan (E04-US02 state Error, UX-04): pesan + "Coba lagi"
 * yang memuat ulang data server (`router.refresh()`) dengan skeleton. Selector
 * bulan & navigasi tetap bisa dipakai.
 */
export function ReportError() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (pending) return <ReportSkeleton />;

  return (
    <div
      role="alert"
      data-testid="report-load-error"
      className="flex flex-col items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-10 text-center text-sm text-destructive"
    >
      <CircleAlertIcon className="size-6" aria-hidden />
      <p>{M.loadError}</p>
      <Button
        variant="outline"
        data-testid="report-retry-button"
        onClick={() => startTransition(() => router.refresh())}
      >
        {M.retry}
      </Button>
    </div>
  );
}
