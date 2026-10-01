/**
 * Grafik tren 6 bulan (E04-US03) — logika murni & isomorfik: jendela 6 bulan
 * (termasuk bulan berjalan, lintas tahun), isi 0 untuk bulan tanpa transaksi,
 * rata-rata pengeluaran, dan deteksi data < 2 bulan. Hasilnya hanya berisi
 * string/number (tanpa BigInt) sehingga aman dikirim ke komponen client.
 */
import {
  formatMonthShort,
  formatMonthYear,
  parseMonthKey,
  shiftMonthKey,
} from "~/lib/date";

/** Panjang jendela tren (bulan), termasuk bulan berjalan. */
export const TREND_MONTH_COUNT = 6;
/** Minimal bulan berdata agar tren dianggap "terlihat" (AC 7). */
export const TREND_MIN_MONTHS_WITH_DATA = 2;

export const TREND_MESSAGES = {
  title: "Tren 6 bulan",
  income: "Pemasukan",
  expense: "Pengeluaran",
  averageLabel: "Rata-rata pengeluaran per bulan",
  averageNote:
    "Total pengeluaran 6 bulan ÷ 6, termasuk bulan berjalan & bulan tanpa transaksi.",
  insufficientData: "Tren akan lebih terlihat setelah ada data minimal 2 bulan",
  tableToggle: "Lihat angka per bulan",
  monthColumn: "Bulan",
  loadError: "Gagal memuat tren. Coba lagi.",
  retry: "Coba lagi",
} as const;

/** Total satu tipe transaksi pada satu bulan (hasil query agregasi). */
export type MonthlyTotal = {
  /** "YYYY-MM". */
  month: string;
  type: "INCOME" | "EXPENSE";
  amount: bigint;
};

/** Satu bulan di grafik tren. */
export type TrendMonth = {
  /** "YYYY-MM" — `trend-bar-<month>`. */
  month: string;
  /** "Okt" (sumbu X). */
  shortLabel: string;
  /** "Oktober 2026" (tooltip, tabel). */
  label: string;
  /** Nominal lengkap sebagai string digit. */
  income: string;
  expense: string;
  /** Ada minimal satu transaksi di bulan ini. */
  hasData: boolean;
};

export type TrendReport = {
  /** 6 bulan, terlama → bulan berjalan. */
  months: TrendMonth[];
  /** Rata-rata pengeluaran per bulan (string digit). */
  averageExpense: string;
  monthsWithData: number;
  /** < 2 bulan berdata → info "Tren akan lebih terlihat …" (AC 7). */
  insufficientData: boolean;
};

const ZERO = BigInt(0);

/** 6 kunci "YYYY-MM" berurutan, berakhir di `currentMonth` (lintas tahun aman). */
export function trendMonthKeys(currentMonth: string): string[] {
  return Array.from({ length: TREND_MONTH_COUNT }, (_, index) =>
    shiftMonthKey(currentMonth, index - (TREND_MONTH_COUNT - 1)),
  );
}

/**
 * Rata-rata pengeluaran per bulan = total pengeluaran jendela ÷ jumlah bulan
 * jendela (6), termasuk bulan berjalan & bulan tanpa data (story §2
 * Assumptions), dibulatkan half-up ke Rupiah penuh.
 */
export function averageExpense(expenses: readonly bigint[]): bigint {
  if (expenses.length === 0) return ZERO;
  const total = expenses.reduce((sum, amount) => sum + amount, ZERO);
  const count = BigInt(expenses.length);
  return (total * BigInt(2) + count) / (count * BigInt(2));
}

/**
 * Laporan tren 6 bulan yang berakhir di `currentMonth` dari total per bulan &
 * tipe. Bulan tanpa baris → 0 (AC 4); baris di luar jendela diabaikan; baris
 * duplikat (bulan + tipe sama) dijumlahkan.
 */
export function buildTrendReport(
  currentMonth: string,
  totals: readonly MonthlyTotal[],
): TrendReport {
  const keys = trendMonthKeys(currentMonth);
  const sums = new Map(
    keys.map((key) => [key, { income: ZERO, expense: ZERO, hasData: false }]),
  );
  for (const row of totals) {
    const sum = sums.get(row.month);
    if (!sum) continue;
    if (row.type === "INCOME") sum.income += row.amount;
    else sum.expense += row.amount;
    sum.hasData = true;
  }

  const months = keys.map((key): TrendMonth => {
    const sum = sums.get(key)!;
    const date = parseMonthKey(key);
    return {
      month: key,
      shortLabel: formatMonthShort(date),
      label: formatMonthYear(date),
      income: sum.income.toString(),
      expense: sum.expense.toString(),
      hasData: sum.hasData,
    };
  });
  const monthsWithData = months.filter((month) => month.hasData).length;

  return {
    months,
    averageExpense: averageExpense(
      keys.map((key) => sums.get(key)!.expense),
    ).toString(),
    monthsWithData,
    insufficientData: monthsWithData < TREND_MIN_MONTHS_WITH_DATA,
  };
}
