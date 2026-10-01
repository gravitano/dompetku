import type { Metadata } from "next";
import { Suspense } from "react";

import { ExpenseCategoryReport } from "~/components/reports/expense-category-report";
import { ReportError } from "~/components/reports/report-error";
import { ReportSkeleton } from "~/components/reports/report-skeleton";
import { ReportsView } from "~/components/reports/reports-view";
import { currentMonthKey } from "~/lib/date";
import { isFaultInjected } from "~/lib/fault-injection";
import { requireUserOrRedirect } from "~/lib/session";
import { getExpenseCategoryReport } from "~/modules/reports/queries";
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
 * (AC 10). Grafik tren 6 bulan (E04-US03) masuk lewat prop `footer`.
 */
export default async function Page({ searchParams }: PageProps<"/reports">) {
  const user = await requireUserOrRedirect();
  const currentMonth = currentMonthKey();
  const { month: param } = await searchParams;
  const month = parseReportMonthParam(param, currentMonth);

  return (
    <ReportsView month={month} currentMonth={currentMonth}>
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
