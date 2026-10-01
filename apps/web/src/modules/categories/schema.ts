/**
 * Schema kelola kategori (E02-US05). Isomorfik: dipakai form client
 * (`~/components/categories/category-form-sheet.tsx`) dan Server Action
 * (`./actions.ts`).
 */
import { z } from "zod";

import { CATEGORY_ICON_KEYS } from "./icons";

export const CATEGORY_TYPES = ["EXPENSE", "INCOME"] as const;
export type CategoryKind = (typeof CATEGORY_TYPES)[number];

/** Panjang maksimum nama kategori (AC 2). */
export const CATEGORY_NAME_MAX_LENGTH = 30;
/** Batas kategori aktif per jenis (keputusan open question, proposal). */
export const CATEGORY_ACTIVE_MAX = 30;

export const CATEGORY_MESSAGES = {
  nameRequired: "Nama wajib diisi",
  nameTooLong: `Nama maksimal ${CATEGORY_NAME_MAX_LENGTH} karakter`,
  nameTaken: "Nama kategori sudah ada",
  iconRequired: "Pilih ikon",
  typeInvalid: "Jenis kategori tidak valid",
  lastActive: "Minimal harus ada 1 kategori aktif",
  limitReached: `Maksimal ${CATEGORY_ACTIVE_MAX} kategori aktif per jenis`,
  inUse:
    "Kategori ini sudah dipakai transaksi atau anggaran, sehingga tidak bisa dihapus. Arsipkan saja.",
  notFound: "Kategori tidak ditemukan",
  systemError: "Gagal menyimpan. Coba lagi.",
  created: "Kategori ditambahkan",
  updated: "Kategori diperbarui",
  archived: "Kategori diarsipkan",
  restored: "Kategori diaktifkan",
  deleted: "Kategori dihapus",
} as const;

/** Kunci perbandingan nama unik: di-trim & tanpa membedakan huruf besar/kecil. */
export function normalizeCategoryName(name: string): string {
  return name.trim().toLocaleLowerCase("id-ID");
}

export const categoryIdSchema = z.uuid(CATEGORY_MESSAGES.notFound);

/** Field form kategori (nama + ikon); jenis mengikuti tab aktif. */
export const categoryFormSchema = z.object({
  name: z
    .string(CATEGORY_MESSAGES.nameRequired)
    .trim()
    .min(1, { message: CATEGORY_MESSAGES.nameRequired, abort: true })
    .max(CATEGORY_NAME_MAX_LENGTH, CATEGORY_MESSAGES.nameTooLong),
  icon: z.enum(CATEGORY_ICON_KEYS, CATEGORY_MESSAGES.iconRequired),
});

export type CategoryFormValues = z.input<typeof categoryFormSchema>;
export type CategoryFormInput = z.output<typeof categoryFormSchema>;

export const categoryCreateSchema = categoryFormSchema.extend({
  type: z.enum(CATEGORY_TYPES, CATEGORY_MESSAGES.typeInvalid),
});

export const categoryUpdateSchema = categoryFormSchema.extend({
  id: categoryIdSchema,
});

/** Arsip / pulihkan / hapus: hanya id. */
export const categoryRefSchema = z.object({ id: categoryIdSchema });

const CATEGORY_FIELDS = ["name", "icon"] as const;
export type CategoryField = (typeof CATEGORY_FIELDS)[number];

export function isCategoryField(field: string): field is CategoryField {
  return (CATEGORY_FIELDS as readonly string[]).includes(field);
}

/** Tab halaman Kategori dari `?type=income|expense` (default pengeluaran). */
export function parseCategoryTab(value: unknown): CategoryKind {
  const raw = Array.isArray(value) ? value[0] : value;
  return typeof raw === "string" && raw.toLowerCase() === "income"
    ? "INCOME"
    : "EXPENSE";
}

/** Tautan halaman Kategori untuk jenis tertentu. */
export function categoriesHref(type: CategoryKind = "EXPENSE"): string {
  return type === "INCOME" ? "/categories?type=income" : "/categories";
}
