import type { Metadata } from "next";
import { Suspense } from "react";

import { ExpenseCategoryReport } from "~/components/reports/expense-category-report";
import { ReportError } from "~/components/reports/report-error";
import { ReportSkeleton } from "~/components/reports/report-skeleton";
import { ReportsView } from "~/components/reports/reports-view";
import { TrendSection } from "~/components/reports/trend-section";
import { TrendSkeleton } from "~/components/reports/trend-skeleton";
import { currentMonthKey } from "~/lib/date";
import { isFaultInjected } from "~/lib/fault-injection";
import { requireUserOrRedirect } from "~/lib/session";
import {
  getExpenseCategoryReport,
  getTrendReport,
} from "~/modules/reports/queries";
import type { TrendReport } from "~/modules/reports/trend";
import {
  parseReportMonthParam,
  type ExpenseCategoryReport as ExpenseCategoryReportData,
} from "~/modules/reports/view";

export const metadata: Metadata = { title: "Laporan" };

/**
 * Tab Laporan — grafik pengeluaran per kategori (E04-US02). Bulan dari
 * `?month=YYYY-MM` (default bulan berjalan, maksimal bulan berjalan). Selector
 * bulan tampil langsung; laporan dimuat di balik skeleton (Suspense) dan
 * kegagalan ditangkap di sini → pesan + "Coba lagi". Data milik user session
 * (AC 10). Grafik tren 6 bulan (E04-US03) masuk lewat prop `footer` dengan
 * `<Suspense>` sendiri — tidak ikut selector bulan dan gagalnya terisolasi.
 */
export default async function Page({ searchParams }: PageProps<"/reports">) {
  const user = await requireUserOrRedirect();
  const currentMonth = currentMonthKey();
  const { month: param } = await searchParams;
  const month = parseReportMonthParam(param, currentMonth);

  return (
    <ReportsView
      month={month}
      currentMonth={currentMonth}
      footer={
        <Suspense fallback={<TrendSkeleton />}>
          <TrendContent userId={user.id} currentMonth={currentMonth} />
        </Suspense>
      }
    >
      <Suspense key={month} fallback={<ReportSkeleton />}>
        <ExpenseCategoryContent
          userId={user.id}
          month={month}
          currentMonth={currentMonth}
        />
      </Suspense>
    </ReportsView>
  );
}

async function loadReport(
  userId: string,
  month: string,
  currentMonth: string,
): Promise<ExpenseCategoryReportData | null> {
  try {
    if (await isFaultInjected("reports-load")) {
      throw new Error("Simulasi gagal memuat laporan (E2E)");
    }
    return await getExpenseCategoryReport(userId, month, currentMonth);
  } catch (error) {
    console.error("[laporan] gagal memuat pengeluaran per kategori", error);
    return null;
  }
}

/** Total + donut + daftar kategori; gagal → pesan + "Coba lagi" (UX-04). */
async function ExpenseCategoryContent({
  userId,
  month,
  currentMonth,
}: {
  userId: string;
  month: string;
  currentMonth: string;
}) {
  const report = await loadReport(userId, month, currentMonth);
  if (!report) return <ReportError />;
  return <ExpenseCategoryReport report={report} />;
}

async function loadTrend(
  userId: string,
  currentMonth: string,
): Promise<TrendReport | null> {
  try {
    if (await isFaultInjected("reports-trend-load")) {
      throw new Error("Simulasi gagal memuat tren (E2E)");
    }
    return await getTrendReport(userId, currentMonth);
  } catch (error) {
    console.error("[laporan] gagal memuat tren 6 bulan", error);
    return null;
  }
}

/** Tren 6 bulan (E04-US03); gagal → pesan + "Coba lagi" di seksi tren saja. */
async function TrendContent({
  userId,
  currentMonth,
}: {
  userId: string;
  currentMonth: string;
}) {
  return <TrendSection initialReport={await loadTrend(userId, currentMonth)} />;
}
