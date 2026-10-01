import "server-only";

import { prisma } from "~/lib/prisma";

import {
  buildFilterCategories,
  buildManagedCategories,
  groupCategoryOptions,
  type CategoryOptionsByType,
  type FilterCategory,
  type ManagedCategory,
} from "./options";

/**
 * Kategori aktif (tidak terarsip) milik `userId`, dikelompokkan per jenis dan
 * diurutkan untuk pilihan form. `userId` wajib dari session.
 */
export async function getActiveCategories(
  userId: string,
): Promise<CategoryOptionsByType> {
  const categories = await prisma.category.findMany({
    where: { userId, archivedAt: null },
    select: { id: true, name: true, type: true, icon: true, isDefault: true },
  });
  return groupCategoryOptions(categories);
}

/**
 * Semua kategori milik `userId` termasuk yang terarsip — untuk panel filter
 * daftar transaksi (E02-US03 AC 4) dan validasi filter kategori dari URL.
 */
export async function getFilterCategories(
  userId: string,
): Promise<FilterCategory[]> {
  const categories = await prisma.category.findMany({
    where: { userId },
    select: {
      id: true,
      name: true,
      type: true,
      icon: true,
      isDefault: true,
      archivedAt: true,
    },
  });
  return buildFilterCategories(categories);
}

/**
 * Semua kategori milik `userId` (aktif & terarsip) beserta jumlah transaksi
 * semua waktu — untuk halaman Kelola Kategori (E02-US05).
 */
export async function getManagedCategories(
  userId: string,
): Promise<ManagedCategory[]> {
  const categories = await prisma.category.findMany({
    where: { userId },
    select: {
      id: true,
      name: true,
      type: true,
      icon: true,
      isDefault: true,
      archivedAt: true,
      _count: { select: { transactions: true } },
    },
  });
  return buildManagedCategories(
    categories.map(({ _count, ...c }) => ({
      ...c,
      transactionCount: _count.transactions,
    })),
  );
}
