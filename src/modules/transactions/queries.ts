import "server-only";

import { prisma } from "~/lib/prisma";
import { currentMonthStart, endOfMonth } from "~/lib/date";

import type { TransactionType } from "./schema";

export type RecentTransaction = {
  id: string;
  type: TransactionType;
  amount: bigint;
  transactionDate: Date;
  note: string | null;
  category: { name: string; icon: string | null };
};

/**
 * Transaksi terbaru milik `userId` (tanggal transaksi terbaru dulu, lalu yang
 * paling akhir dicatat). Versi minimal untuk Beranda/Transaksi (E02-US01);
 * filter & pagination menyusul di E02-US03.
 */
export async function getRecentTransactions(
  userId: string,
  limit = 5,
): Promise<RecentTransaction[]> {
  return prisma.transaction.findMany({
    where: { userId },
    orderBy: [{ transactionDate: "desc" }, { createdAt: "desc" }],
    take: limit,
    select: {
      id: true,
      type: true,
      amount: true,
      transactionDate: true,
      note: true,
      category: { select: { name: true, icon: true } },
    },
  });
}

export type MonthTotals = {
  /** Tanggal 1 bulan berjalan (Asia/Jakarta), date-only. */
  month: Date;
  income: bigint;
  expense: bigint;
};

/** Total pemasukan & pengeluaran bulan berjalan (zona Asia/Jakarta). */
export async function getMonthTotals(
  userId: string,
  now: Date = new Date(),
): Promise<MonthTotals> {
  const month = currentMonthStart(now);
  const groups = await prisma.transaction.groupBy({
    by: ["type"],
    where: {
      userId,
      transactionDate: { gte: month, lte: endOfMonth(month) },
    },
    _sum: { amount: true },
  });
  const sumOf = (type: TransactionType) =>
    groups.find((g) => g.type === type)?._sum.amount ?? BigInt(0);
  return { month, income: sumOf("INCOME"), expense: sumOf("EXPENSE") };
}
