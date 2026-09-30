import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

import { Button } from "~/components/ui/button";
import { formatMonthYear, parseMonthKey, shiftMonthKey } from "~/lib/date";
import { TRANSACTION_MONTH_MIN } from "~/modules/transactions/schema";

type MonthNavigatorProps = {
  /** "YYYY-MM" yang sedang ditampilkan. */
  month: string;
  /** "YYYY-MM" bulan berjalan (Asia/Jakarta) — batas ▶ (UX-02). */
  currentMonth: string;
  onChange: (month: string) => void;
};

/** Navigasi bulan **◀ September 2026 ▶** (E02-US03 AC 3, UX-01/UX-02). */
export function MonthNavigator({
  month,
  currentMonth,
  onChange,
}: MonthNavigatorProps) {
  const label = formatMonthYear(parseMonthKey(month));
  const prev = shiftMonthKey(month, -1);
  const next = shiftMonthKey(month, 1);
  const prevDisabled = month <= TRANSACTION_MONTH_MIN;
  const nextDisabled = month >= currentMonth;

  return (
    <nav
      aria-label="Pilih bulan"
      data-testid="month-navigator"
      className="flex items-center justify-center gap-2"
    >
      <Button
        variant="ghost"
        size="icon-lg"
        data-testid="month-prev-button"
        aria-label={`Bulan sebelumnya, ${formatMonthYear(parseMonthKey(prev))}`}
        disabled={prevDisabled}
        onClick={() => onChange(prev)}
      >
        <ChevronLeftIcon className="size-5" />
      </Button>
      <p
        data-testid="month-label"
        data-month={month}
        aria-live="polite"
        className="min-w-40 text-center text-base font-semibold"
      >
        {label}
      </p>
      <Button
        variant="ghost"
        size="icon-lg"
        data-testid="month-next-button"
        aria-label={
          nextDisabled
            ? "Bulan berikutnya (sudah bulan berjalan)"
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
