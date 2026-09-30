/**
 * Schema validasi transaksi (E02-US01 catat pengeluaran, dipakai juga E02-US02
 * catat pemasukan). Isomorfik: dipakai form client
 * (`~/components/transactions/transaction-form.tsx`) dan Server Action
 * (`./actions.ts`). Aturan tanggal dievaluasi saat validasi berjalan, sehingga
 * server selalu memakai jam server (zona Asia/Jakarta).
 */
import { z } from "zod";

import { formatRupiah } from "~/lib/format";
import { parseDateOnly, toJakartaDateString } from "~/lib/date";

export const TRANSACTION_TYPES = ["EXPENSE", "INCOME"] as const;
export type TransactionType = (typeof TRANSACTION_TYPES)[number];

/** Batas nominal per transaksi (AC 4): Rp 1.000.000.000. */
export const TRANSACTION_AMOUNT_MAX = 1_000_000_000;
/** Panjang maksimum catatan (AC 6, kolom `note VARCHAR(100)`). */
export const NOTE_MAX_LENGTH = 100;
/** Batas teknis tanggal paling lama (bukan aturan bisnis). */
export const TRANSACTION_DATE_MIN = "2000-01-01";

export const TRANSACTION_MESSAGES = {
  amountRequired: "Nominal wajib diisi",
  amountInvalid: "Nominal harus berupa angka",
  amountMin: "Nominal harus lebih dari 0",
  amountMax: `Nominal maksimal ${formatRupiah(TRANSACTION_AMOUNT_MAX)}`,
  categoryRequired: "Pilih kategori",
  /** Kategori tidak ada / milik user lain / beda jenis / terarsip. */
  categoryInvalid: "Kategori tidak valid. Pilih kategori lain.",
  dateRequired: "Tanggal wajib diisi",
  dateInvalid: "Tanggal tidak valid",
  dateFuture: "Tanggal tidak boleh melebihi hari ini",
  noteTooLong: `Catatan maksimal ${NOTE_MAX_LENGTH} karakter`,
  typeInvalid: "Jenis transaksi tidak valid",
  systemError: "Gagal menyimpan. Periksa koneksi lalu coba lagi.",
  saved: {
    EXPENSE: "Pengeluaran tersimpan",
    INCOME: "Pemasukan tersimpan",
  },
  noCategories: {
    EXPENSE: "Belum ada kategori pengeluaran",
    INCOME: "Belum ada kategori pemasukan",
  },
} as const;

function isValidDateOnly(value: string): boolean {
  try {
    parseDateOnly(value);
    return true;
  } catch {
    return false;
  }
}

export const transactionSchema = z.object({
  type: z.enum(TRANSACTION_TYPES, TRANSACTION_MESSAGES.typeInvalid),
  /** String digit dari input nominal ("25000"). */
  amount: z
    .string(TRANSACTION_MESSAGES.amountRequired)
    .trim()
    .min(1, { message: TRANSACTION_MESSAGES.amountRequired, abort: true })
    .regex(/^\d+$/, {
      message: TRANSACTION_MESSAGES.amountInvalid,
      abort: true,
    })
    .transform(Number)
    .pipe(
      z
        .number()
        .positive(TRANSACTION_MESSAGES.amountMin)
        .max(TRANSACTION_AMOUNT_MAX, TRANSACTION_MESSAGES.amountMax),
    ),
  categoryId: z
    .string(TRANSACTION_MESSAGES.categoryRequired)
    .min(1, { message: TRANSACTION_MESSAGES.categoryRequired, abort: true })
    .pipe(z.uuid(TRANSACTION_MESSAGES.categoryInvalid)),
  /** "YYYY-MM-DD" (kalender Asia/Jakarta). */
  transactionDate: z
    .string(TRANSACTION_MESSAGES.dateRequired)
    .min(1, { message: TRANSACTION_MESSAGES.dateRequired, abort: true })
    .refine(isValidDateOnly, {
      message: TRANSACTION_MESSAGES.dateInvalid,
      abort: true,
    })
    .refine((value) => value >= TRANSACTION_DATE_MIN, {
      message: TRANSACTION_MESSAGES.dateInvalid,
      abort: true,
    })
    .refine((value) => value <= toJakartaDateString(), {
      message: TRANSACTION_MESSAGES.dateFuture,
    }),
  note: z
    .string()
    .trim()
    .max(NOTE_MAX_LENGTH, TRANSACTION_MESSAGES.noteTooLong)
    .optional()
    .transform((note) => (note ? note : null)),
});

/** Nilai form (sebelum transform). */
export type TransactionFormValues = z.input<typeof transactionSchema>;
/** Data tervalidasi: nominal number, catatan `null` bila kosong. */
export type TransactionInput = z.output<typeof transactionSchema>;
export type TransactionField = keyof TransactionFormValues;

export const TRANSACTION_FIELDS: readonly TransactionField[] = [
  "type",
  "amount",
  "categoryId",
  "transactionDate",
  "note",
];

export function isTransactionField(field: string): field is TransactionField {
  return (TRANSACTION_FIELDS as readonly string[]).includes(field);
}
