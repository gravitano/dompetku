import "server-only";

import { prisma } from "~/lib/prisma";

import {
  buildFilterCategories,
  groupCategoryOptions,
  type CategoryOptionsByType,
  type FilterCategory,
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
