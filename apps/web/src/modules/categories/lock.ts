import "server-only";

import type { Prisma } from "~/generated/prisma/client";
import { prisma } from "~/lib/prisma";

export type Tx = Prisma.TransactionClient;

/**
 * Jalankan mutasi kategori/anggaran milik `userId` dalam satu transaksi DB yang
 * diawali advisory lock per user: mutasi kategori & anggaran satu user (mis.
 * dari dua tab) diserialkan sehingga cek "nama unik", "minimal 1 aktif",
 * "kategori aktif" (atur anggaran) dan "punya anggaran" (hapus kategori) tidak
 * bisa dilewati oleh race.
 */
export async function withCategoryLock<T>(
  userId: string,
  run: (tx: Tx) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`categories:${userId}`}, 0))`;
    return run(tx);
  });
}
