/**
 * Kategori bawaan yang di-seed untuk setiap user (ITA §4.2). Datanya ada di
 * `./default-categories` (modul murni, juga dipakai fixture E2E).
 *
 * Dipakai oleh:
 * - `prisma/seed.ts` (user demo)
 * - story registrasi (E01-US01) — panggil `seedDefaultCategories(user.id)`
 *   segera setelah user dibuat (mis. di databaseHooks better-auth atau action).
 */
import type { Prisma } from "~/generated/prisma/client";

import { DEFAULT_CATEGORIES } from "./default-categories";

export {
  DEFAULT_CATEGORIES,
  DEFAULT_EXPENSE_CATEGORIES,
  DEFAULT_INCOME_CATEGORIES,
  type DefaultCategory,
} from "./default-categories";

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
