import "server-only";

import { prisma } from "~/lib/prisma";

import { groupCategoryOptions, type CategoryOptionsByType } from "./options";

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
