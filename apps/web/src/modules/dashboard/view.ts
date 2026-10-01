/**
 * Model tampilan Beranda (E04-US01) — murni & isomorfik. Aturan status
 * anggaran memakai `budgetUsage` (E03-US02), tidak menghitung ambang sendiri.
 */
import {
  budgetAttention,
  type BudgetAttention,
} from "~/modules/budgets/alerts";
import type { MonthBudgetItem } from "~/modules/budgets/queries";
import { budgetUsage, type BudgetUsage } from "~/modules/budgets/status";
import type {
  MonthCategoryTotals,
  RecentTransaction,
} from "~/modules/transactions/queries";

/** Jumlah transaksi terbaru di Beranda (AC 6). */
export const DASHBOARD_RECENT_LIMIT = 5;

/** Teks Beranda (UI Bahasa Indonesia). */
export const DASHBOARD_MESSAGES = {
  income: "Pemasukan",
  expense: "Pengeluaran",
  net: "Selisih",
  budgetTitle: "Anggaran bulan ini",
  budgetLink: "Lihat anggaran",
  budgetSetup: "Atur anggaran bulan ini",
  budgetSetupHint:
    "Tentukan batas pengeluaran per kategori agar pengeluaranmu tetap terkendali.",
  recentTitle: "Transaksi terbaru",
  seeAll: "Lihat semua",
  emptyTitle: "Belum ada transaksi, catat pengeluaran pertamamu",
  emptyCta: "Catat pengeluaran",
  loadError: "Gagal memuat ringkasan. Periksa koneksi lalu coba lagi.",
  retry: "Coba lagi",
} as const;

/** Nilai `data-state` selisih: hijau "+", merah "−", netral. */
export type NetState = "positive" | "negative" | "zero";

const ZERO = BigInt(0);

export function netState(net: bigint): NetState {
  if (net > ZERO) return "positive";
  if (net < ZERO) return "negative";
  return "zero";
}

export type DashboardView = {
  /** Tanggal 1 bulan berjalan (Asia/Jakarta), date-only. */
  month: Date;
  income: bigint;
  expense: bigint;
  /** Selisih = pemasukan − pengeluaran bulan berjalan. */
  net: bigint;
  netState: NetState;
  /** Ringkasan total anggaran; `null` bila belum ada anggaran bulan ini (AC 5). */
  budget: BudgetUsage | null;
  /**
   * Kategori beranggaran bulan berjalan yang Hampir habis / Terlampaui — banner
   * peringatan (E03-US03 AC 8); `null` = tidak ada banner.
   */
  attention: BudgetAttention | null;
  /** Transaksi terbaru lintas bulan (keputusan open question design). */
  recent: RecentTransaction[];
  /** Belum punya transaksi sama sekali → empty state (AC 10). */
  isNewUser: boolean;
};

/**
 * `budgets` = anggaran bulan berjalan (+ nama kategori); pengeluaran per
 * kategori diambil dari `totals.expenseByCategory` (query yang sama dengan
 * total bulan — tidak dihitung dua kali).
 */
export function buildDashboardView({
  totals,
  budgets,
  recent,
}: {
  totals: MonthCategoryTotals;
  budgets: readonly MonthBudgetItem[];
  recent: RecentTransaction[];
}): DashboardView {
  const net = totals.income - totals.expense;
  const totalBudget = budgets.reduce((sum, b) => sum + b.amount, ZERO);
  return {
    month: totals.month,
    income: totals.income,
    expense: totals.expense,
    net,
    netState: netState(net),
    budget:
      // Total anggaran vs SELURUH pengeluaran bulan (termasuk kategori tanpa
      // anggaran — keputusan PO, sama dengan E03-US02).
      budgets.length > 0 ? budgetUsage(totals.expense, totalBudget) : null,
    attention: budgetAttention(
      budgets.map((b) => ({
        name: b.name,
        budget: b.amount,
        spent: totals.expenseByCategory.get(b.categoryId) ?? ZERO,
      })),
    ),
    recent: recent.slice(0, DASHBOARD_RECENT_LIMIT),
    isNewUser: recent.length === 0,
  };
}
