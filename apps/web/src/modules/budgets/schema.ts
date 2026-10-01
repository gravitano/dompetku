/**
 * Schema anggaran bulanan per kategori (E03-US01). Isomorfik: dipakai form
 * client (`~/components/budgets/budget-form-sheet.tsx`) dan Server Action
 * (`./actions.ts`). Aturan bulan dievaluasi terhadap `currentMonth` yang
 * diberikan; di server selalu jam server (zona Asia/Jakarta).
 */
import { z } from "zod";

import { currentMonthKey, shiftMonthKey } from "~/lib/date";
import { formatRupiah } from "~/lib/format";

/** Batas nominal anggaran per kategori per bulan: Rp 1.000.000.000. */
export const BUDGET_AMOUNT_MAX = 1_000_000_000;
/** Bulan paling awal yang bisa dibuka (sejalan dengan batas tanggal transaksi). */
export const BUDGET_MONTH_MIN = "2000-01";
/** Maksimal berapa bulan ke depan anggaran bisa diatur (AC 2). */
export const BUDGET_MONTHS_AHEAD = 1;

export const BUDGET_MESSAGES = {
  amountRequired: "Nominal wajib diisi",
  amountInvalid: "Nominal harus berupa angka",
  amountMin: "Nominal harus lebih dari 0",
  amountMax: `Nominal maksimal ${formatRupiah(BUDGET_AMOUNT_MAX)}`,
  monthInvalid: "Bulan tidak valid",
  monthPast: "Anggaran bulan yang sudah lewat hanya bisa dilihat",
  monthTooFar: `Anggaran hanya bisa diatur maksimal ${BUDGET_MONTHS_AHEAD} bulan ke depan`,
  /** Kategori tidak ada / milik user lain / pemasukan / terarsip. */
  categoryNotFound: "Kategori tidak ditemukan",
  notFound: "Anggaran tidak ditemukan",
  alreadyHasBudgets: "Bulan ini sudah punya anggaran",
  nothingToCopy: "Bulan lalu belum punya anggaran",
  systemError: "Gagal menyimpan. Periksa koneksi lalu coba lagi.",
  deleteError: "Gagal menghapus. Periksa koneksi lalu coba lagi.",
  copyError: "Gagal menyalin. Periksa koneksi lalu coba lagi.",
  saved: "Anggaran tersimpan",
  deleted: "Anggaran dihapus",
  copied: (monthLabel: string) => `Anggaran disalin dari ${monthLabel}`,
  notSet: "Belum diatur",
  readOnly: "Hanya lihat",
  archived: "Diarsipkan",
  empty: "Belum ada anggaran untuk bulan ini",
  emptyHintCopy: "atau tap kategori di bawah untuk atur manual",
  emptyHint: "Tap kategori untuk mengatur anggaran",
  copyButton: "Salin dari bulan lalu",
  totalLabel: "Total anggaran",
  // E03-US02 — indikator pemakaian
  summaryLabel: "Pemakaian anggaran",
  spentLabel: "Terpakai",
  unbudgetedTitle: "Tanpa anggaran",
  notSetTitle: "Belum diatur",
  setBudget: "Atur anggaran",
  loadError: "Gagal memuat anggaran. Coba lagi.",
  retry: "Coba lagi",
} as const;

const monthKeySchema = z
  .string(BUDGET_MESSAGES.monthInvalid)
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, BUDGET_MESSAGES.monthInvalid);

/** Bulan terjauh yang bisa dibuka/diatur: bulan berjalan + 1. */
export function budgetMaxMonth(currentMonth: string = currentMonthKey()) {
  return shiftMonthKey(currentMonth, BUDGET_MONTHS_AHEAD);
}

/** Bulan bisa diatur bila bulan berjalan atau bulan depan (AC 2, AC 10). */
export function isBudgetMonthEditable(
  month: string,
  currentMonth: string = currentMonthKey(),
): boolean {
  return month >= currentMonth && month <= budgetMaxMonth(currentMonth);
}

/**
 * Bulan halaman Anggaran dari `?month=YYYY-MM`: tidak valid → bulan berjalan,
 * di luar `[BUDGET_MONTH_MIN, bulan berjalan + 1]` → dibatasi ke ujungnya.
 */
export function parseBudgetMonthParam(
  value: unknown,
  currentMonth: string = currentMonthKey(),
): string {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!monthKeySchema.safeParse(raw).success) return currentMonth;
  const month = raw as string;
  const max = budgetMaxMonth(currentMonth);
  if (month > max) return max;
  if (month < BUDGET_MONTH_MIN) return BUDGET_MONTH_MIN;
  return month;
}

/** Tautan halaman Anggaran; bulan berjalan tanpa `?month=`. */
export function budgetsHref(
  month?: string,
  currentMonth: string = currentMonthKey(),
): string {
  return month && month !== currentMonth
    ? `/budgets?month=${month}`
    : "/budgets";
}

/** Nominal dari input (string digit "1500000") → number 1..1.000.000.000. */
export const budgetAmountSchema = z
  .string(BUDGET_MESSAGES.amountRequired)
  .trim()
  .min(1, { message: BUDGET_MESSAGES.amountRequired, abort: true })
  .regex(/^\d+$/, { message: BUDGET_MESSAGES.amountInvalid, abort: true })
  .transform(Number)
  .pipe(
    z
      .number()
      .positive(BUDGET_MESSAGES.amountMin)
      .max(BUDGET_AMOUNT_MAX, BUDGET_MESSAGES.amountMax),
  );

const categoryIdSchema = z.uuid(BUDGET_MESSAGES.categoryNotFound);

/** Kategori + bulan: kunci anggaran (unik per user). */
export const budgetRefSchema = z.object({
  categoryId: categoryIdSchema,
  month: monthKeySchema,
});

/** Input `setBudgetAction` (atur baru atau ubah — AC 4, 5, 7). */
export const budgetSetSchema = budgetRefSchema.extend({
  amount: budgetAmountSchema,
});
export type BudgetSetValues = z.input<typeof budgetSetSchema>;
export type BudgetSetInput = z.output<typeof budgetSetSchema>;

/** Input `copyPreviousBudgetsAction` (AC 9): bulan tujuan. */
export const budgetCopySchema = z.object({ month: monthKeySchema });

/**
 * Pesan bila bulan tidak bisa diubah (lampau / terlalu jauh), atau `null`
 * bila boleh.
 */
export function budgetMonthError(
  month: string,
  currentMonth: string = currentMonthKey(),
): string | null {
  if (month < currentMonth) return BUDGET_MESSAGES.monthPast;
  if (month > budgetMaxMonth(currentMonth)) return BUDGET_MESSAGES.monthTooFar;
  return null;
}
