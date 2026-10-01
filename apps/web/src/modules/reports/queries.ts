import "server-only";

import { endOfMonth, formatDateOnly, parseMonthKey } from "~/lib/date";
import { prisma } from "~/lib/prisma";
import { getMonthExpenseByCategory } from "~/modules/budgets/queries";

import {
  buildTrendReport,
  trendMonthKeys,
  type MonthlyTotal,
  type TrendReport,
} from "./trend";

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

/**
 * Total pemasukan & pengeluaran per bulan milik `userId` (dari session, AC 8)
 * untuk bulan `fromMonth` s.d. `toMonth` ("YYYY-MM", inklusif). SATU query
 * agregasi ter-parameter (`GROUP BY` bulan & tipe, index `(user_id,
 * transaction_date)`, ITA §4.2). `transaction_date` bertipe DATE = kalender
 * Asia/Jakarta (ITA §4.1), jadi bulan cukup diambil dari tanggalnya.
 */
export async function getMonthlyTotals(
  userId: string,
  fromMonth: string,
  toMonth: string,
): Promise<MonthlyTotal[]> {
  const from = formatDateOnly(parseMonthKey(fromMonth));
  const to = formatDateOnly(endOfMonth(parseMonthKey(toMonth)));
  const rows = await prisma.$queryRaw<
    { month: string; type: string; amount: bigint }[]
  >`
    SELECT to_char(transaction_date, 'YYYY-MM') AS month,
           type::text AS type,
           SUM(amount)::bigint AS amount
    FROM transactions
    WHERE user_id = ${userId}
      AND transaction_date >= ${from}::date
      AND transaction_date <= ${to}::date
    GROUP BY 1, 2
  `;
  return rows.map((row) => ({
    month: row.month,
    type: row.type === "INCOME" ? "INCOME" : "EXPENSE",
    amount: BigInt(row.amount),
  }));
}

/** Tren pemasukan vs pengeluaran 6 bulan terakhir s.d. `currentMonth` (E04-US03). */
export async function getTrendReport(
  userId: string,
  currentMonth: string,
): Promise<TrendReport> {
  const keys = trendMonthKeys(currentMonth);
  const totals = await getMonthlyTotals(userId, keys[0], currentMonth);
  return buildTrendReport(currentMonth, totals);
}
