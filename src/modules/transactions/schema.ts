/**
 * Schema validasi transaksi (E02-US01 catat pengeluaran, dipakai juga E02-US02
 * catat pemasukan). Isomorfik: dipakai form client
 * (`~/components/transactions/transaction-form.tsx`) dan Server Action
 * (`./actions.ts`). Aturan tanggal dievaluasi saat validasi berjalan, sehingga
 * server selalu memakai jam server (zona Asia/Jakarta).
 */
import { z } from "zod";

import { formatRupiah } from "~/lib/format";
import {
  currentMonthKey,
  parseDateOnly,
  toJakartaDateString,
} from "~/lib/date";

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

// ---------------------------------------------------------------------------
// Ubah & hapus transaksi (E02-US04)
// ---------------------------------------------------------------------------

export const TRANSACTION_EDIT_MESSAGES = {
  title: "Detail Transaksi",
  submit: "Simpan perubahan",
  updated: "Perubahan tersimpan",
  deleted: "Transaksi dihapus",
  updateError: "Gagal menyimpan perubahan. Coba lagi.",
  deleteError: "Gagal menghapus transaksi. Coba lagi.",
  /** Tidak ada / sudah dihapus / milik user lain (tanpa dibedakan, AC 11). */
  notFound: "Transaksi tidak ditemukan",
  deleteTitle: "Hapus transaksi ini?",
  deleteWarning: "Tindakan ini tidak bisa dibatalkan.",
  archived: "Diarsipkan",
} as const;

/** Id transaksi di input Server Action ubah/hapus. */
export const transactionIdSchema = z.uuid();

/** Input `updateTransactionAction`: id + field form (validasi = catat). */
export const transactionUpdateSchema = transactionSchema.extend({
  id: transactionIdSchema,
});
export type TransactionUpdateValues = z.input<typeof transactionUpdateSchema>;

/** Input `deleteTransactionAction`. */
export const transactionDeleteSchema = z.object({ id: transactionIdSchema });

// ---------------------------------------------------------------------------
// Daftar transaksi dengan filter (E02-US03)
// ---------------------------------------------------------------------------

/** Jumlah transaksi per halaman infinite scroll (AC 9). */
export const TRANSACTION_PAGE_SIZE = 50;
/** Batas jumlah kategori di filter (melindungi query dari URL yang sangat panjang). */
export const TRANSACTION_FILTER_MAX_CATEGORIES = 50;
/** Bulan paling awal yang bisa dibuka (sejalan dengan `TRANSACTION_DATE_MIN`). */
export const TRANSACTION_MONTH_MIN = TRANSACTION_DATE_MIN.slice(0, 7);

export const TRANSACTION_LIST_MESSAGES = {
  loadError: "Gagal memuat transaksi.",
  retry: "Coba lagi",
  emptyFiltered: "Tidak ada transaksi yang cocok dengan filter",
  end: "Semua transaksi sudah ditampilkan",
  notFound: "Transaksi tidak ditemukan",
} as const;

/** Nama parameter URL `/transactions` (kontrak dengan E04-US02). */
export const TRANSACTION_LIST_PARAMS = {
  month: "month",
  type: "type",
  category: "category",
} as const;

/** Nilai `type` di URL (huruf kecil) ↔ enum. */
export const TRANSACTION_TYPE_PARAM: Record<TransactionType, string> = {
  EXPENSE: "expense",
  INCOME: "income",
};

/**
 * Filter daftar transaksi yang sudah divalidasi. `month` "YYYY-MM"
 * (Asia/Jakarta), `type` null = Semua, `categoryIds` kosong = semua kategori.
 */
export type TransactionListFilter = {
  month: string;
  type: TransactionType | null;
  categoryIds: string[];
};

export type SearchParamsInput =
  URLSearchParams | Record<string, string | string[] | undefined>;

function getAllParams(params: SearchParamsInput, name: string): string[] {
  if (params instanceof URLSearchParams) return params.getAll(name);
  const value = params[name];
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

const uuidSchema = z.uuid();
const monthKeySchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);

function isMonthKey(value: string): boolean {
  return monthKeySchema.safeParse(value).success;
}

/** Bulan valid & dalam batas [TRANSACTION_MONTH_MIN, bulan berjalan]. */
function clampMonth(value: string | undefined, current: string): string {
  if (!value || !isMonthKey(value)) return current;
  if (value > current) return current;
  if (value < TRANSACTION_MONTH_MIN) return TRANSACTION_MONTH_MIN;
  return value;
}

function parseTypeParam(value: string | undefined): TransactionType | null {
  const normalized = value?.trim().toLowerCase();
  if (normalized === "expense") return "EXPENSE";
  if (normalized === "income") return "INCOME";
  return null;
}

/**
 * Parse search params `/transactions` → filter (AC 7, 12). Nilai tidak valid
 * diabaikan, bukan error: bulan salah/masa depan → bulan berjalan, jenis tak
 * dikenal → Semua, id kategori bukan UUID dibuang. Kepemilikan kategori
 * divalidasi terpisah (`normalizeTransactionListFilter`) karena butuh data user.
 */
export function parseTransactionListParams(
  params: SearchParamsInput,
  currentMonth: string = currentMonthKey(),
): TransactionListFilter {
  const P = TRANSACTION_LIST_PARAMS;
  const categoryIds = new Set<string>();
  for (const raw of getAllParams(params, P.category)) {
    for (const part of raw.split(",")) {
      const id = part.trim().toLowerCase();
      if (uuidSchema.safeParse(id).success) categoryIds.add(id);
    }
  }
  return {
    month: clampMonth(getAllParams(params, P.month)[0], currentMonth),
    type: parseTypeParam(getAllParams(params, P.type)[0]),
    categoryIds: [...categoryIds].slice(0, TRANSACTION_FILTER_MAX_CATEGORIES),
  };
}

/**
 * Search string untuk filter (tanpa "?"); `month` dihilangkan bila bulan
 * berjalan sehingga daftar default tetap `/transactions`.
 */
export function transactionListSearch(
  filter: Partial<TransactionListFilter>,
  currentMonth: string = currentMonthKey(),
): string {
  const P = TRANSACTION_LIST_PARAMS;
  const params = new URLSearchParams();
  if (filter.month && filter.month !== currentMonth) {
    params.set(P.month, filter.month);
  }
  if (filter.type) params.set(P.type, TRANSACTION_TYPE_PARAM[filter.type]);
  for (const id of filter.categoryIds ?? []) params.append(P.category, id);
  return params.toString();
}

/**
 * Tautan ke daftar transaksi terfilter, mis. dari grafik Laporan (E04-US02):
 * `transactionListHref({ month: "2026-09", type: "EXPENSE", categoryIds: [id] })`.
 */
export function transactionListHref(
  filter: Partial<TransactionListFilter>,
  currentMonth: string = currentMonthKey(),
): string {
  const search = transactionListSearch(filter, currentMonth);
  return search ? `/transactions?${search}` : "/transactions";
}

/** Penanda detail dibuka dari daftar (`?from=list`), lihat `transactionDetailHref`. */
export const FROM_LIST_PARAM = { name: "from", value: "list" } as const;
/** Penanda detail dibuka dari Beranda (`?from=home`), lihat `homeDetailHref`. */
export const FROM_HOME_VALUE = "home";

/** Tautan detail dari transaksi terbaru di Beranda (E02-US04 AC 1). */
export function homeDetailHref(id: string): string {
  return `/transactions/${id}?${FROM_LIST_PARAM.name}=${FROM_HOME_VALUE}`;
}

/**
 * Tautan detail transaksi dari daftar: membawa penanda `from=list` + filter
 * daftar yang aktif, agar tombol Kembali kembali ke daftar yang sama tanpa
 * bergantung pada riwayat browser.
 */
export function transactionDetailHref(
  id: string,
  filter: Partial<TransactionListFilter>,
  currentMonth: string = currentMonthKey(),
): string {
  const search = transactionListSearch(filter, currentMonth);
  const from = `${FROM_LIST_PARAM.name}=${FROM_LIST_PARAM.value}`;
  return `/transactions/${id}?${from}${search ? `&${search}` : ""}`;
}

/**
 * Tujuan tombol Kembali / tutup di detail: daftar dengan filter asal bila
 * dibuka dari daftar (`from=list`, filter divalidasi ulang — hanya path
 * internal `/transactions`), Beranda bila `from=home`, selain itu daftar bulan
 * transaksi tsb (`fallbackMonth`).
 */
export function detailBackHref(
  params: SearchParamsInput,
  fallbackMonth: string,
  currentMonth: string = currentMonthKey(),
): string {
  const from = getAllParams(params, FROM_LIST_PARAM.name)[0];
  if (from === FROM_HOME_VALUE) return "/";
  const fromList = from === FROM_LIST_PARAM.value;
  const filter = fromList
    ? parseTransactionListParams(params, currentMonth)
    : { month: fallbackMonth };
  return transactionListHref(filter, currentMonth);
}

/** Kategori minimal untuk validasi filter. */
export type FilterableCategory = { id: string; type: TransactionType };

/**
 * Buang id kategori yang bukan milik user (tidak dikenal = diabaikan, tanpa
 * membocorkan data) dan — bila jenis dipilih — kategori jenis lain (UX-07).
 */
export function normalizeTransactionListFilter(
  filter: TransactionListFilter,
  categories: readonly FilterableCategory[],
): TransactionListFilter {
  const byId = new Map(categories.map((c) => [c.id, c]));
  const categoryIds = filter.categoryIds.filter((id) => {
    const category = byId.get(id);
    return !!category && (!filter.type || category.type === filter.type);
  });
  return { ...filter, categoryIds };
}

/** Jumlah filter aktif (badge tombol Filter): jenis + tiap kategori. */
export function countActiveFilters(filter: TransactionListFilter): number {
  return (filter.type ? 1 : 0) + filter.categoryIds.length;
}

/** Posisi terakhir yang sudah dimuat (urutan tanggal, createdAt, id menurun). */
export const transactionCursorSchema = z.object({
  date: z.string().refine(isValidDateOnly),
  createdAt: z.iso.datetime(),
  id: z.uuid(),
});
export type TransactionCursor = z.infer<typeof transactionCursorSchema>;

/** Input Server Action halaman berikutnya (infinite scroll). */
export const transactionPageRequestSchema = z.object({
  filter: z.object({
    month: z
      .string()
      .refine(isMonthKey)
      .refine((value) => value >= TRANSACTION_MONTH_MIN)
      .refine((value) => value <= currentMonthKey()),
    type: z.enum(TRANSACTION_TYPES).nullable(),
    categoryIds: z.array(z.uuid()).max(TRANSACTION_FILTER_MAX_CATEGORIES),
  }),
  cursor: transactionCursorSchema,
});
export type TransactionPageRequest = z.infer<
  typeof transactionPageRequestSchema
>;
