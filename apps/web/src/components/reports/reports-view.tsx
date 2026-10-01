"use client";

import { useRouter } from "next/navigation";
import { useOptimistic, useTransition, type ReactNode } from "react";

import { PageHeader } from "~/components/layout/page-header";
import { MonthNavigator } from "~/components/transactions/month-navigator";
import { reportsHref } from "~/modules/reports/view";

import { ReportSkeleton } from "./report-skeleton";

const MONTH_TEST_IDS = {
  root: "report-month-navigator",
  prev: "report-month-prev",
  label: "report-month-label",
  next: "report-month-next",
};

type ReportsViewProps = {
  /** "YYYY-MM" bulan terpilih. */
  month: string;
  /** "YYYY-MM" bulan berjalan menurut jam server (Asia/Jakarta). */
  currentMonth: string;
  /** Seksi bulanan (E04-US02) — diganti skeleton saat berpindah bulan. */
  children: ReactNode;
  /**
   * Seksi di bawah laporan bulanan yang tidak ikut selector bulan (slot
   * grafik tren 6 bulan E04-US03).
   */
  footer?: ReactNode;
};

/**
 * Tab **Laporan** (E04-US02): navigasi bulan ◀ ▶ (▶ nonaktif di bulan
 * berjalan, AC 2) di atas seksi bulanan. Bulan tersimpan di URL (`?month=`);
 * saat berpindah, label langsung berganti dan seksi menampilkan skeleton
 * sampai data bulan baru tiba (UX-01).
 */
export function ReportsView({
  month,
  currentMonth,
  children,
  footer,
}: ReportsViewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [shownMonth, setShownMonth] = useOptimistic(month);

  function navigate(next: string) {
    startTransition(() => {
      setShownMonth(next);
      router.push(reportsHref(next, currentMonth), { scroll: false });
    });
  }

  return (
    <div
      data-testid="reports-page"
      data-month={month}
      aria-busy={isPending}
      className="flex flex-col gap-4 md:max-w-4xl"
    >
      <PageHeader title="Laporan" />
      <MonthNavigator
        month={shownMonth}
        currentMonth={currentMonth}
        testIds={MONTH_TEST_IDS}
        onChange={navigate}
      />
      {isPending ? <ReportSkeleton /> : children}
      {footer}
    </div>
  );
}
