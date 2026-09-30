/**
 * Kategori bawaan yang di-seed untuk setiap user (ITA §4.2).
 *
 * Dipakai oleh:
 * - `prisma/seed.ts` (user demo)
 * - story registrasi (E01-US01) — panggil `seedDefaultCategories(user.id)`
 *   segera setelah user dibuat (mis. di databaseHooks better-auth atau action).
 */
import type { CategoryType, Prisma } from "~/generated/prisma/client";

export type DefaultCategory = {
  name: string;
  type: CategoryType;
  icon: string;
};

export const DEFAULT_EXPENSE_CATEGORIES: readonly DefaultCategory[] = [
  { name: "Makan & Minum", type: "EXPENSE", icon: "utensils" },
  { name: "Transportasi", type: "EXPENSE", icon: "bus" },
  { name: "Belanja", type: "EXPENSE", icon: "shopping-cart" },
  { name: "Tagihan", type: "EXPENSE", icon: "receipt" },
  { name: "Hiburan", type: "EXPENSE", icon: "clapperboard" },
  { name: "Kesehatan", type: "EXPENSE", icon: "heart-pulse" },
  { name: "Lainnya", type: "EXPENSE", icon: "package" },
];

export const DEFAULT_INCOME_CATEGORIES: readonly DefaultCategory[] = [
  { name: "Gaji", type: "INCOME", icon: "wallet" },
  { name: "Bonus", type: "INCOME", icon: "gift" },
  { name: "Hadiah", type: "INCOME", icon: "party-popper" },
  { name: "Lainnya", type: "INCOME", icon: "package" },
];

export const DEFAULT_CATEGORIES: readonly DefaultCategory[] = [
  ...DEFAULT_EXPENSE_CATEGORIES,
  ...DEFAULT_INCOME_CATEGORIES,
];

/** Client minimal yang dibutuhkan: PrismaClient atau transaction client. */
export type CategoryDb = { category: Prisma.TransactionClient["category"] };

/**
 * Buat kategori bawaan untuk `userId` — hanya bila user belum punya kategori
 * sama sekali (user baru). Idempotent: menjalankan ulang seed tidak
 * menghidupkan lagi kategori bawaan yang sudah diubah namanya / dihapus user
 * (E02-US05) dan tidak menabrak aturan nama unik per jenis.
 *
 * @param db opsional — isi dengan transaction client (`tx`) bila dipanggil di
 *           dalam `prisma.$transaction`, atau client lain (seed). Default: `prisma`.
 * @returns jumlah kategori yang baru dibuat.
 */
export async function seedDefaultCategories(
  userId: string,
  db?: CategoryDb,
): Promise<number> {
  const client = db ?? (await import("~/lib/prisma")).prisma;

  const existing = await client.category.count({ where: { userId } });
  if (existing > 0) return 0;

  const result = await client.category.createMany({
    data: DEFAULT_CATEGORIES.map((c) => ({ ...c, userId, isDefault: true })),
  });
  return result.count;
}
