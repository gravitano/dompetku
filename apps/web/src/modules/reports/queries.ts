import "server-only";

import { prisma } from "~/lib/prisma";
import { getMonthExpenseByCategory } from "~/modules/budgets/queries";

import {
  buildExpenseCategoryReport,
  type CategoryExpense,
  type ExpenseCategoryReport,
} from "./view";

/**
 * Pengeluaran per kategori milik `userId` (dari session, AC 10) bulan `month`
 * ("YYYY-MM", kalender Asia/Jakarta). Dua query: `groupBy` pengeluaran per
 * kategori (index `(user_id, transaction_date)`, ITA §4.2) lalu nama/ikon
 * kategori yang muncul — termasuk kategori terarsip (AC 5). Pemasukan tidak
 * dihitung.
 */
export async function getMonthCategoryExpenses(
  userId: string,
  month: string,
): Promise<CategoryExpense[]> {
  const spent = await getMonthExpenseByCategory(userId, month);
  if (spent.size === 0) return [];
  const categories = await prisma.category.findMany({
    where: { userId, id: { in: [...spent.keys()] } },
    select: { id: true, name: true, icon: true, archivedAt: true },
  });
  return categories.map((category) => ({
    categoryId: category.id,
    name: category.name,
    icon: category.icon,
    archived: category.archivedAt !== null,
    amount: spent.get(category.id) ?? BigInt(0),
  }));
}

/** Laporan pengeluaran per kategori (E04-US02) bulan `month`. */
export async function getExpenseCategoryReport(
  userId: string,
  month: string,
  currentMonth: string,
): Promise<ExpenseCategoryReport> {
  const expenses = await getMonthCategoryExpenses(userId, month);
  return buildExpenseCategoryReport(month, expenses, currentMonth);
}
