import "server-only";

import type { Prisma } from "~/generated/prisma/client";
import { prisma } from "~/lib/prisma";
import {
  currentMonthStart,
  endOfMonth,
  formatDateOnly,
  parseDateOnly,
  parseMonthKey,
} from "~/lib/date";

import type {
  DayTotals,
  TransactionListItem,
  TransactionListPage,
  TransactionListSummary,
} from "./list";
import {
  TRANSACTION_PAGE_SIZE,
  type TransactionCursor,
  type TransactionListFilter,
  type TransactionType,
} from "./schema";

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
 * paling akhir dicatat). Dipakai Beranda; tab Transaksi memakai
 * `getTransactionListPage` (E02-US03).
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

// ---------------------------------------------------------------------------
// Daftar transaksi dengan filter (E02-US03)
// ---------------------------------------------------------------------------

/**
 * Kondisi daftar: selalu ter-scope `userId` (dari session), rentang tanggal
 * bulan filter (DATE, kalender Asia/Jakarta), jenis, dan kategori. Memakai
 * index `(user_id, transaction_date)` / `(user_id, category_id,
 * transaction_date)` (ITA §4.2).
 */
export function buildTransactionListWhere(
  userId: string,
  filter: TransactionListFilter,
): Prisma.TransactionWhereInput {
  const month = parseMonthKey(filter.month);
  return {
    userId,
    transactionDate: { gte: month, lte: endOfMonth(month) },
    ...(filter.type ? { type: filter.type } : {}),
    ...(filter.categoryIds.length > 0
      ? { categoryId: { in: filter.categoryIds } }
      : {}),
  };
}

/**
 * Transaksi setelah `cursor` pada urutan `(transaction_date DESC, created_at
 * DESC, id DESC)` — stabil walau ada transaksi baru dicatat saat scroll.
 */
export function buildCursorWhere(
  cursor: TransactionCursor,
): Prisma.TransactionWhereInput {
  const date = parseDateOnly(cursor.date);
  const createdAt = new Date(cursor.createdAt);
  return {
    OR: [
      { transactionDate: { lt: date } },
      { transactionDate: date, createdAt: { lt: createdAt } },
      { transactionDate: date, createdAt, id: { lt: cursor.id } },
    ],
  };
}

export const TRANSACTION_LIST_ORDER: Prisma.TransactionOrderByWithRelationInput[] =
  [{ transactionDate: "desc" }, { createdAt: "desc" }, { id: "desc" }];

const ZERO = BigInt(0);

const LIST_ITEM_SELECT = {
  id: true,
  type: true,
  amount: true,
  transactionDate: true,
  note: true,
  createdAt: true,
  category: {
    select: { id: true, name: true, icon: true, archivedAt: true },
  },
} satisfies Prisma.TransactionSelect;

type ListItemRow = Prisma.TransactionGetPayload<{
  select: typeof LIST_ITEM_SELECT;
}>;

function toListItem(row: ListItemRow): TransactionListItem {
  return {
    id: row.id,
    type: row.type,
    amount: row.amount,
    date: formatDateOnly(row.transactionDate),
    note: row.note,
    createdAt: row.createdAt.toISOString(),
    category: {
      id: row.category.id,
      name: row.category.name,
      icon: row.category.icon,
      archived: row.category.archivedAt !== null,
    },
  };
}

function sumByType(
  groups: ReadonlyArray<{
    type: TransactionType;
    _sum: { amount: bigint | null };
  }>,
  type: TransactionType,
): bigint {
  return groups
    .filter((group) => group.type === type)
    .reduce((sum, group) => sum + (group._sum.amount ?? ZERO), ZERO);
}

/**
 * Ringkasan periode + filter aktif (AC 5): dihitung dari SELURUH transaksi
 * yang cocok, bukan hanya halaman yang sudah tampil (AC 9).
 */
export async function getTransactionListSummary(
  userId: string,
  filter: TransactionListFilter,
): Promise<TransactionListSummary> {
  const groups = await prisma.transaction.groupBy({
    by: ["type"],
    where: buildTransactionListWhere(userId, filter),
    _sum: { amount: true },
  });
  const income = sumByType(groups, "INCOME");
  const expense = sumByType(groups, "EXPENSE");
  return { income, expense, net: income - expense };
}

/**
 * Satu halaman daftar (50 transaksi, AC 9) setelah `cursor` (halaman pertama
 * bila tanpa cursor), beserta total bersih per tanggal untuk tanggal di
 * halaman tsb — dihitung dari seluruh transaksi tanggal itu sesuai filter,
 * sehingga header tanggal akurat walau grup terpotong antar halaman.
 */
export async function getTransactionListPage(
  userId: string,
  filter: TransactionListFilter,
  cursor?: TransactionCursor | null,
): Promise<TransactionListPage> {
  const where = buildTransactionListWhere(userId, filter);
  const rows = await prisma.transaction.findMany({
    where: cursor ? { AND: [where, buildCursorWhere(cursor)] } : where,
    orderBy: TRANSACTION_LIST_ORDER,
    take: TRANSACTION_PAGE_SIZE + 1,
    select: LIST_ITEM_SELECT,
  });

  const hasMore = rows.length > TRANSACTION_PAGE_SIZE;
  const items = rows.slice(0, TRANSACTION_PAGE_SIZE).map(toListItem);

  const dates = [...new Set(items.map((item) => item.date))];
  const dayTotals: DayTotals = {};
  if (dates.length > 0) {
    const groups = await prisma.transaction.groupBy({
      by: ["transactionDate", "type"],
      where: { ...where, transactionDate: { in: dates.map(parseDateOnly) } },
      _sum: { amount: true },
    });
    for (const date of dates) {
      const ofDate = groups.filter(
        (group) => formatDateOnly(group.transactionDate) === date,
      );
      dayTotals[date] = {
        income: sumByType(ofDate, "INCOME"),
        expense: sumByType(ofDate, "EXPENSE"),
      };
    }
  }

  const last = items.at(-1);
  return {
    items,
    dayTotals,
    nextCursor:
      hasMore && last
        ? { date: last.date, createdAt: last.createdAt, id: last.id }
        : null,
  };
}

export type TransactionDetail = TransactionListItem;

/**
 * Detail transaksi milik `userId` (tujuan tap baris daftar, E02-US03 AC 10).
 * Milik user lain / tidak ada → `null` (tanpa membedakan keduanya).
 */
export async function getTransactionDetail(
  userId: string,
  id: string,
): Promise<TransactionDetail | null> {
  const row = await prisma.transaction.findFirst({
    where: { id, userId },
    select: LIST_ITEM_SELECT,
  });
  return row ? toListItem(row) : null;
}
