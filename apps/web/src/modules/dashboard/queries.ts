import "server-only";

import { currentMonthKey } from "~/lib/date";
import { getBudgetSummary } from "~/modules/budgets/queries";
import {
  getMonthTotals,
  getRecentTransactions,
} from "~/modules/transactions/queries";

import {
  buildDashboardView,
  DASHBOARD_RECENT_LIMIT,
  type DashboardView,
} from "./view";

/**
 * Data Beranda (E04-US01) milik `userId` (dari session): total bulan berjalan,
 * ringkasan anggaran, dan 5 transaksi terbaru — semua query jalan paralel
 * (target < 2 detik, AC 11) memakai index `(user_id, transaction_date)`
 * (ITA §4.2). Bulan dihitung sekali dari `now` agar konsisten saat pergantian
 * bulan. Waktu muat dicatat ke log server.
 */
export async function getDashboardData(
  userId: string,
  now: Date = new Date(),
): Promise<DashboardView> {
  const started = performance.now();
  const [totals, recent, budget] = await Promise.all([
    getMonthTotals(userId, now),
    getRecentTransactions(userId, DASHBOARD_RECENT_LIMIT),
    getBudgetSummary(userId, currentMonthKey(now)),
  ]);
  const elapsed = Math.round(performance.now() - started);
  console.info(`[beranda] data dimuat dalam ${elapsed} ms`);
  return buildDashboardView({ totals, budget, recent });
}
