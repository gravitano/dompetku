/**
 * Laporan pengeluaran per kategori (E04-US02) — logika murni & isomorfik:
 * agregasi, urutan, persentase (persepuluhan), irisan donut, dan tautan ke
 * daftar transaksi terfilter (E02-US03). Hasilnya hanya berisi string/number
 * (tanpa BigInt) sehingga aman dikirim ke komponen client.
 */
import { formatMonthYear, parseMonthKey } from "~/lib/date";
import { categorySlug } from "~/modules/categories/options";
import {
  parseTransactionListParams,
  transactionListHref,
} from "~/modules/transactions/schema";

export const REPORT_MESSAGES = {
  totalLabel: "Total pengeluaran",
  empty: "Belum ada pengeluaran di bulan ini",
  loadError: "Gagal memuat laporan. Periksa koneksi lalu coba lagi.",
  retry: "Coba lagi",
  archived: "(diarsipkan)",
  other: "Lainnya",
} as const;

/** Jumlah warna kategori (token `--category-1` … `--category-8`). */
export const CATEGORY_COLOR_COUNT = 8;
/**
 * Maksimal irisan donut. Lebih dari ini → 7 kategori terbesar + "Lainnya"
 * (warna netral); daftar di bawah grafik tetap lengkap.
 */
export const CHART_MAX_SLICES = CATEGORY_COLOR_COUNT;
/** Kunci irisan gabungan "Lainnya" (`chart-segment-lainnya`). */
export const OTHER_SLICE_KEY = "lainnya";

/** Warna kategori ke-`index` (0-based, urutan terbesar) atau warna "Lainnya". */
export function categoryColor(index: number | null): string {
  return index === null
    ? "var(--category-other)"
    : `var(--category-${(index % CATEGORY_COLOR_COUNT) + 1})`;
}

/** Pengeluaran satu kategori pada satu bulan (hasil query). */
export type CategoryExpense = {
  categoryId: string;
  name: string;
  icon: string | null;
  archived: boolean;
  amount: bigint;
};

/** Satu baris daftar kategori di bawah grafik (UX-03). */
export type CategoryBreakdownItem = {
  categoryId: string;
  /** Kunci unik per laporan (slug nama) — `data-category`, `chart-segment-<key>`. */
  key: string;
  name: string;
  icon: string | null;
  archived: boolean;
  /** Nominal lengkap sebagai string digit (BigInt tidak bisa dikirim ke client). */
  amount: string;
  /** Persentase × 10 (125 = 12,5%). */
  percentTenths: number;
  /** Warna titik/irisan (CSS var), sama dengan irisan donut. */
  color: string;
  /** Daftar transaksi terfilter kategori + bulan (E02-US03). */
  href: string;
};

/** Satu irisan donut (UX-02): kategori, atau gabungan "Lainnya". */
export type ChartSlice = {
  key: string;
  name: string;
  /** Nilai untuk proporsi irisan (presisi Number cukup untuk sudut). */
  value: number;
  amount: string;
  percentTenths: number;
  color: string;
  href: string;
  /** Jumlah kategori di irisan ini (> 1 hanya untuk "Lainnya"). */
  categoryCount: number;
};

export type ExpenseCategoryReport = {
  /** "YYYY-MM". */
  month: string;
  /** "September 2026". */
  monthLabel: string;
  /** Total pengeluaran (string digit). */
  total: string;
  items: CategoryBreakdownItem[];
  slices: ChartSlice[];
};

const ZERO = BigInt(0);

/**
 * Persentase tiap nominal terhadap `total` dalam persepuluhan, dibulatkan
 * half-up ke 1 desimal (asumsi story). Bila jumlah hasil pembulatan menyimpang
 * lebih dari 0,1 poin dari 100% (banyak kategori), selisih di atas 0,1 dikoreksi
 * dengan metode sisa terbesar sehingga jumlahnya selalu 99,9–100,1% (AC 6) —
 * tiga kategori sama besar tetap 33,3% masing-masing (total 99,9%).
 */
export function percentTenths(amounts: readonly bigint[]): number[] {
  const total = amounts.reduce((sum, amount) => sum + amount, ZERO);
  if (total <= ZERO) return amounts.map(() => 0);
  const parts = amounts.map((amount) => {
    const numerator = amount * BigInt(1000);
    const floor = numerator / total;
    const remainder = numerator % total;
    const up = remainder * BigInt(2) >= total;
    return {
      rounded: Number(floor) + (up ? 1 : 0),
      // Besar pembulatan (dalam satuan 1/total persepuluhan).
      roundedUpBy: up ? total - remainder : ZERO,
      roundedDownBy: up ? ZERO : remainder,
    };
  });
  const result = parts.map((part) => part.rounded);
  let diff = result.reduce((sum, value) => sum + value, 0) - 1000;
  if (Math.abs(diff) <= 1) return result;

  const order = parts
    .map((part, index) => ({ part, index }))
    .sort((a, b) => {
      const key = (p: (typeof parts)[number]) =>
        diff > 0 ? p.roundedUpBy : p.roundedDownBy;
      const ka = key(a.part);
      const kb = key(b.part);
      return ka === kb ? a.index - b.index : kb > ka ? 1 : -1;
    });
  for (const { index } of order) {
    if (Math.abs(diff) <= 1) break;
    if (diff > 0 && result[index] > 0) {
      result[index] -= 1;
      diff -= 1;
    } else if (diff < 0) {
      result[index] += 1;
      diff += 1;
    }
  }
  return result;
}

/**
 * Laporan bulan `month` dari pengeluaran per kategori: hanya kategori dengan
 * nominal > 0 (termasuk terarsip, AC 5), urut nominal terbesar (seri → nama),
 * persentase konsisten, warna per urutan, dan tautan daftar transaksi terfilter
 * kategori + bulan (AC 7). Lebih dari `CHART_MAX_SLICES` kategori → irisan
 * donut "Lainnya" untuk sisanya.
 */
export function buildExpenseCategoryReport(
  month: string,
  expenses: readonly CategoryExpense[],
  currentMonth: string,
): ExpenseCategoryReport {
  const sorted = expenses
    .filter((expense) => expense.amount > ZERO)
    .sort(
      (a, b) =>
        (a.amount === b.amount ? 0 : a.amount > b.amount ? -1 : 1) ||
        a.name.localeCompare(b.name, "id") ||
        a.categoryId.localeCompare(b.categoryId),
    );
  const total = sorted.reduce((sum, expense) => sum + expense.amount, ZERO);
  const percents = percentTenths(sorted.map((expense) => expense.amount));
  const grouped = sorted.length > CHART_MAX_SLICES;
  const ownColors = grouped ? CHART_MAX_SLICES - 1 : sorted.length;

  const used = new Set<string>([OTHER_SLICE_KEY]);
  const items = sorted.map((expense, index): CategoryBreakdownItem => {
    const stem = categorySlug(expense.name) || "kategori";
    let key = stem;
    for (let n = 2; used.has(key); n++) key = `${stem}-${n}`;
    used.add(key);
    return {
      categoryId: expense.categoryId,
      key,
      name: expense.name,
      icon: expense.icon,
      archived: expense.archived,
      amount: expense.amount.toString(),
      percentTenths: percents[index],
      color: categoryColor(index < ownColors ? index : null),
      href: transactionListHref(
        { month, categoryIds: [expense.categoryId] },
        currentMonth,
      ),
    };
  });

  const slices: ChartSlice[] = items.slice(0, ownColors).map((item) => ({
    key: item.key,
    name: item.name,
    value: Number(item.amount),
    amount: item.amount,
    percentTenths: item.percentTenths,
    color: item.color,
    href: item.href,
    categoryCount: 1,
  }));
  if (grouped) {
    const rest = items.slice(ownColors);
    const amount = rest.reduce((sum, item) => sum + BigInt(item.amount), ZERO);
    slices.push({
      key: OTHER_SLICE_KEY,
      name: REPORT_MESSAGES.other,
      value: Number(amount),
      amount: amount.toString(),
      percentTenths: rest.reduce((sum, item) => sum + item.percentTenths, 0),
      color: categoryColor(null),
      href: transactionListHref(
        { month, categoryIds: rest.map((item) => item.categoryId) },
        currentMonth,
      ),
      categoryCount: rest.length,
    });
  }

  return {
    month,
    monthLabel: formatMonthYear(parseMonthKey(month)),
    total: total.toString(),
    items,
    slices,
  };
}

/**
 * Bulan laporan dari `?month=YYYY-MM` — aturan sama dengan tab Transaksi:
 * tidak valid / masa depan → bulan berjalan, sebelum batas bawah → batas bawah.
 */
export function parseReportMonthParam(
  raw: string | string[] | undefined,
  currentMonth: string,
): string {
  return parseTransactionListParams({ month: raw }, currentMonth).month;
}

/** Tautan tab Laporan; bulan berjalan tanpa `?month=`. */
export function reportsHref(month: string, currentMonth: string): string {
  return month === currentMonth ? "/reports" : `/reports?month=${month}`;
}
