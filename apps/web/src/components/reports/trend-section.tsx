"use client";

import { CircleAlertIcon, InfoIcon } from "lucide-react";
import { useState, useTransition } from "react";

import { Button } from "~/components/ui/button";
import { formatRupiah } from "~/lib/format";
import { loadTrendReport } from "~/modules/reports/actions";
import {
  TREND_MESSAGES as M,
  type TrendMonth,
  type TrendReport,
} from "~/modules/reports/trend";

import { TrendChart } from "./trend-chart";
import { TrendSectionFrame, TrendSkeletonBody } from "./trend-skeleton";

/** Legenda teks (UX-01) — informasi tidak hanya lewat warna (AC 6). */
function TrendLegend() {
  return (
    <ul
      data-testid="trend-legend"
      aria-label="Legenda"
      className="flex flex-wrap gap-x-4 gap-y-1 text-sm"
    >
      <li className="flex items-center gap-1.5">
        <span aria-hidden className="size-3 rounded-sm bg-income" />
        {M.income}
      </li>
      <li className="flex items-center gap-1.5">
        <span aria-hidden className="size-3 rounded-sm bg-expense" />
        {M.expense}
      </li>
    </ul>
  );
}

/** Tabel angka per bulan — jalur keyboard/screen reader & angka lengkap. */
function TrendTable({ months }: { months: readonly TrendMonth[] }) {
  return (
    <details className="group text-sm">
      <summary className="cursor-pointer rounded-sm text-muted-foreground outline-none select-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50">
        {M.tableToggle}
      </summary>
      <table data-testid="trend-table" className="mt-2 w-full tabular-nums">
        <caption className="sr-only">
          {M.income} dan {M.expense.toLowerCase()} per bulan, {M.title}
        </caption>
        <thead className="text-left text-muted-foreground">
          <tr>
            <th scope="col" className="py-1 font-medium">
              {M.monthColumn}
            </th>
            <th scope="col" className="py-1 text-right font-medium">
              {M.income}
            </th>
            <th scope="col" className="py-1 text-right font-medium">
              {M.expense}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {months.map((month) => (
            <tr
              key={month.month}
              data-testid="trend-table-row"
              data-month={month.month}
            >
              <th scope="row" className="py-1 text-left font-normal">
                {month.label}
              </th>
              <td className="py-1 text-right">
                {formatRupiah(BigInt(month.income))}
              </td>
              <td className="py-1 text-right">
                {formatRupiah(BigInt(month.expense))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}

function TrendContent({ report }: { report: TrendReport }) {
  return (
    <>
      <TrendLegend />
      {report.insufficientData ? (
        <p
          data-testid="trend-insufficient-data"
          className="flex items-start gap-2 rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground"
        >
          <InfoIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
          {M.insufficientData}
        </p>
      ) : null}
      <TrendChart months={report.months} />
      <div>
        <p
          data-testid="trend-average-expense"
          data-value={report.averageExpense}
        >
          {M.averageLabel}:{" "}
          <span className="font-semibold text-expense tabular-nums">
            {formatRupiah(BigInt(report.averageExpense))}
          </span>
        </p>
        <p
          data-testid="trend-average-note"
          className="mt-0.5 text-xs text-muted-foreground"
        >
          {M.averageNote}
        </p>
      </div>
      <TrendTable months={report.months} />
    </>
  );
}

/**
 * Seksi **"Tren 6 bulan"** di bawah tab Laporan (E04-US03): legenda, info data
 * < 2 bulan, grafik batang + tooltip, rata-rata pengeluaran, dan tabel angka.
 * Tidak ikut selector bulan. Gagal dimuat → pesan + "Coba lagi" yang memuat
 * ulang seksi ini saja lewat server action (UX-05) — grafik kategori di atasnya
 * tidak tersentuh.
 */
export function TrendSection({
  initialReport,
}: {
  /** `null` = gagal dimuat di server. */
  initialReport: TrendReport | null;
}) {
  const [report, setReport] = useState(initialReport);
  // Render ulang server (mis. pindah bulan di selector) → pakai data terbaru.
  const [serverReport, setServerReport] = useState(initialReport);
  if (initialReport !== serverReport) {
    setServerReport(initialReport);
    setReport(initialReport);
  }
  const [pending, startTransition] = useTransition();

  function retry() {
    startTransition(async () => {
      const result = await loadTrendReport().catch(() => null);
      if (result?.success) setReport(result.data);
    });
  }

  let body;
  if (pending) {
    body = <TrendSkeletonBody />;
  } else if (report) {
    body = <TrendContent report={report} />;
  } else {
    body = (
      <div
        role="alert"
        data-testid="trend-load-error"
        className="flex flex-col items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-8 text-center text-sm text-destructive"
      >
        <CircleAlertIcon className="size-6" aria-hidden />
        <p>{M.loadError}</p>
        <Button
          variant="outline"
          data-testid="trend-retry-button"
          onClick={retry}
        >
          {M.retry}
        </Button>
      </div>
    );
  }

  return <TrendSectionFrame>{body}</TrendSectionFrame>;
}
