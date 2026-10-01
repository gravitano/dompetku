"use client";

import { CircleAlertIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { Button } from "~/components/ui/button";
import { DASHBOARD_MESSAGES as M } from "~/modules/dashboard/view";

import { DashboardSkeleton } from "./dashboard-skeleton";

/**
 * Gagal memuat Beranda (E04-US01 state Error, UX-07): pesan + "Coba lagi".
 * Coba lagi memuat ulang data server (`router.refresh()`) dengan skeleton;
 * header, navigasi, dan FAB tetap bisa dipakai.
 */
export function DashboardError() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (pending) return <DashboardSkeleton />;

  return (
    <div
      role="alert"
      data-testid="dashboard-load-error"
      className="flex flex-col items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-10 text-center text-sm text-destructive"
    >
      <CircleAlertIcon className="size-6" aria-hidden />
      <p>{M.loadError}</p>
      <Button
        variant="outline"
        data-testid="dashboard-retry-button"
        onClick={() => startTransition(() => router.refresh())}
      >
        {M.retry}
      </Button>
    </div>
  );
}
