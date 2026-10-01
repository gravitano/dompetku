import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "~/components/ui/button";
import { formatMonthYear, parseMonthKey, shiftMonthKey } from "~/lib/date";
import { TRANSACTION_MONTH_MIN } from "~/modules/transactions/schema";

type MonthNavigatorTestIds = {
  root: string;
  prev: string;
  label: string;
  next: string;
};

const DEFAULT_TEST_IDS: MonthNavigatorTestIds = {
  root: "month-navigator",
  prev: "month-prev-button",
  label: "month-label",
  next: "month-next-button",
};

type MonthNavigatorProps = {
  /** "YYYY-MM" yang sedang ditampilkan. */
  month: string;
  /** "YYYY-MM" bulan berjalan (Asia/Jakarta). */
  currentMonth: string;
  onChange: (month: string) => void;
  /** Batas ▶ — default bulan berjalan (daftar transaksi, E02-US03 UX-02). */
  maxMonth?: string;
  /** Batas ◀ — default bulan transaksi paling awal. */
  minMonth?: string;
  /** Selector per halaman (default: selector daftar transaksi). */
  testIds?: MonthNavigatorTestIds;
  /** Konten tambahan di bawah label bulan (mis. label "Hanya lihat"). */
  children?: ReactNode;
};

/**
 * Navigasi bulan **◀ September 2026 ▶** (E02-US03 AC 3, UX-01/UX-02; dipakai
 * juga halaman Anggaran E03-US01 dengan `maxMonth` bulan depan).
 */
export function MonthNavigator({
  month,
  currentMonth,
  onChange,
  maxMonth = currentMonth,
  minMonth = TRANSACTION_MONTH_MIN,
  testIds = DEFAULT_TEST_IDS,
  children,
}: MonthNavigatorProps) {
  const label = formatMonthYear(parseMonthKey(month));
  const prev = shiftMonthKey(month, -1);
  const next = shiftMonthKey(month, 1);
  const prevDisabled = month <= minMonth;
  const nextDisabled = month >= maxMonth;

  return (
    <nav
      aria-label="Pilih bulan"
      data-testid={testIds.root}
      className="flex items-center justify-center gap-2"
    >
      <Button
        variant="ghost"
        size="icon-lg"
        data-testid={testIds.prev}
        aria-label={`Bulan sebelumnya, ${formatMonthYear(parseMonthKey(prev))}`}
        disabled={prevDisabled}
        onClick={() => onChange(prev)}
      >
        <ChevronLeftIcon className="size-5" />
      </Button>
      <div className="flex min-w-40 flex-col items-center gap-1">
        <p
          data-testid={testIds.label}
          data-month={month}
          aria-live="polite"
          className="text-center text-base font-semibold"
        >
          {label}
        </p>
        {children}
      </div>
      <Button
        variant="ghost"
        size="icon-lg"
        data-testid={testIds.next}
        aria-label={
          nextDisabled
            ? maxMonth === currentMonth
              ? "Bulan berikutnya (sudah bulan berjalan)"
              : "Bulan berikutnya (tidak tersedia)"
            : `Bulan berikutnya, ${formatMonthYear(parseMonthKey(next))}`
        }
        disabled={nextDisabled}
        onClick={() => onChange(next)}
      >
        <ChevronRightIcon className="size-5" />
      </Button>
    </nav>
  );
}
