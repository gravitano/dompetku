import "server-only";

import type { Prisma } from "~/generated/prisma/client";
import { endOfMonth, parseMonthKey, shiftMonthKey } from "~/lib/date";
import { prisma } from "~/lib/prisma";

import {
  buildBudgetRows,
  groupBudgetRows,
  sumBudgets,
  sumSpent,
  type BudgetMonthView,
  type MonthBudget,
} from "./view";

/**
 * Anggaran per kategori milik `userId` pada bulan `month` ("YYYY-MM"),
 * termasuk kategori terarsip. Dipakai halaman Anggaran (E03-US01) dan
 * indikator pemakaian (E03-US02).
 */
export async function getMonthBudgets(
  userId: string,
  month: string,
): Promise<MonthBudget[]> {
  return prisma.budget.findMany({
    where: { userId, periodMonth: parseMonthKey(month) },
    select: { categoryId: true, amount: true },
  });
}

/**
 * Data halaman Anggaran bulan `month`: baris kategori + pemakaiannya (E03-US02),
 * total anggaran, total seluruh pengeluaran, dan jumlah anggaran bulan lalu
 * yang bisa disalin (kategori aktif). `userId` dari session.
 */
export async function getBudgetMonth(
  userId: string,
  month: string,
): Promise<BudgetMonthView> {
  const previous = parseMonthKey(shiftMonthKey(month, -1));
  const [categories, budgets, spent, copyableFromPrevious] = await Promise.all([
    prisma.category.findMany({
      where: { userId, type: "EXPENSE" },
      select: {
        id: true,
        name: true,
        type: true,
        icon: true,
        isDefault: true,
        archivedAt: true,
      },
    }),
    getMonthBudgets(userId, month),
    getMonthExpenseByCategory(userId, month),
    prisma.budget.count({
      where: {
        userId,
        periodMonth: previous,
        category: { userId, type: "EXPENSE", archivedAt: null },
      },
    }),
  ]);

  const rows = buildBudgetRows(categories, budgets, spent);
  return {
    month,
    rows,
    sections: groupBudgetRows(rows),
    total: sumBudgets(budgets),
    totalSpent: sumSpent(spent),
    budgetCount: budgets.length,
    copyableFromPrevious,
  };
}

/**
 * Total pengeluaran per kategori milik `userId` pada bulan `month` (semua
 * kategori, termasuk tanpa anggaran & terarsip) — untuk indikator E03-US02 dan
 * bagian "Tanpa anggaran".
 */
export async function getMonthExpenseByCategory(
  userId: string,
  month: string,
): Promise<Map<string, bigint>> {
  const start = parseMonthKey(month);
  const groups = await prisma.transaction.groupBy({
    by: ["categoryId"],
    where: {
      userId,
      type: "EXPENSE",
      transactionDate: { gte: start, lte: endOfMonth(start) },
    },
    _sum: { amount: true },
  });
  return new Map(groups.map((g) => [g.categoryId, g._sum.amount ?? BigInt(0)]));
}

/** Anggaran satu kategori + nama kategorinya (banner E03-US03, Beranda). */
export type MonthBudgetItem = MonthBudget & { name: string };

/**
 * Semua anggaran bulan `month` milik `userId` beserta nama kategorinya
 * (termasuk kategori terarsip) — Beranda: ringkasan anggaran (E04-US01) dan
 * banner peringatan (E03-US03) dari satu query.
 */
export async function getMonthBudgetList(
  userId: string,
  month: string,
): Promise<MonthBudgetItem[]> {
  const rows = await prisma.budget.findMany({
    where: { userId, periodMonth: parseMonthKey(month) },
    select: {
      categoryId: true,
      amount: true,
      category: { select: { name: true } },
    },
  });
  return rows.map((row) => ({
    categoryId: row.categoryId,
    amount: row.amount,
    name: row.category.name,
  }));
}

/** Client Prisma biasa atau client transaksi interaktif (`$transaction`). */
type Db = Pick<Prisma.TransactionClient, "budget" | "transaction">;

export type CategoryBudgetSpend = {
  categoryName: string;
  budget: bigint;
  spent: bigint;
};

/**
 * Anggaran + total pengeluaran satu kategori milik `userId` pada bulan
 * `monthStart` (tanggal 1, date-only), atau `null` bila kategori itu tidak
 * punya anggaran bulan tsb. Dipanggil sebelum & sesudah menyimpan pengeluaran
 * di transaksi DB yang sama untuk deteksi "naik level" (E03-US03).
 */
export async function getCategoryBudgetSpend(
  db: Db,
  userId: string,
  categoryId: string,
  monthStart: Date,
): Promise<CategoryBudgetSpend | null> {
  const budget = await db.budget.findFirst({
    where: { userId, categoryId, periodMonth: monthStart },
    select: { amount: true, category: { select: { name: true } } },
  });
  if (!budget) return null;
  return {
    categoryName: budget.category.name,
    budget: budget.amount,
    spent: await getCategorySpent(db, userId, categoryId, monthStart),
  };
}

/** Total pengeluaran satu kategori milik `userId` di bulan `monthStart`. */
export async function getCategorySpent(
  db: Db,
  userId: string,
  categoryId: string,
  monthStart: Date,
): Promise<bigint> {
  const spent = await db.transaction.aggregate({
    where: {
      userId,
      categoryId,
      type: "EXPENSE",
      transactionDate: { gte: monthStart, lte: endOfMonth(monthStart) },
    },
    _sum: { amount: true },
  });
  return spent._sum.amount ?? BigInt(0);
}
