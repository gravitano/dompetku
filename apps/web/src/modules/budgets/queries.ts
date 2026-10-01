import "server-only";

import { endOfMonth, parseMonthKey, shiftMonthKey } from "~/lib/date";
import { prisma } from "~/lib/prisma";

import {
  buildBudgetRows,
  sumBudgets,
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
 * Data halaman Anggaran bulan `month`: baris kategori, total, dan jumlah
 * anggaran bulan lalu yang bisa disalin (kategori aktif). `userId` dari
 * session.
 */
export async function getBudgetMonth(
  userId: string,
  month: string,
): Promise<BudgetMonthView> {
  const previous = parseMonthKey(shiftMonthKey(month, -1));
  const [categories, budgets, copyableFromPrevious] = await Promise.all([
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
    prisma.budget.count({
      where: {
        userId,
        periodMonth: previous,
        category: { userId, type: "EXPENSE", archivedAt: null },
      },
    }),
  ]);

  return {
    month,
    rows: buildBudgetRows(categories, budgets),
    total: sumBudgets(budgets),
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

export type BudgetSummary = {
  /** Jumlah semua anggaran bulan tsb. */
  totalBudget: bigint;
  /**
   * Seluruh pengeluaran bulan tsb, TERMASUK kategori tanpa anggaran (keputusan
   * PO; definisi sama untuk E03-US02 dan Beranda E04-US01).
   */
  totalSpent: bigint;
  /** 0 → Beranda menampilkan ajakan "Atur anggaran bulan ini". */
  budgetCount: number;
};

/**
 * Ringkasan anggaran vs pengeluaran bulan `month` milik `userId` — kartu
 * ringkasan halaman Anggaran (E03-US02) dan Beranda (E04-US01).
 */
export async function getBudgetSummary(
  userId: string,
  month: string,
): Promise<BudgetSummary> {
  const start = parseMonthKey(month);
  const [budget, spent] = await Promise.all([
    prisma.budget.aggregate({
      where: { userId, periodMonth: start },
      _sum: { amount: true },
      _count: { _all: true },
    }),
    prisma.transaction.aggregate({
      where: {
        userId,
        type: "EXPENSE",
        transactionDate: { gte: start, lte: endOfMonth(start) },
      },
      _sum: { amount: true },
    }),
  ]);
  return {
    totalBudget: budget._sum.amount ?? BigInt(0),
    totalSpent: spent._sum.amount ?? BigInt(0),
    budgetCount: budget._count._all,
  };
}
