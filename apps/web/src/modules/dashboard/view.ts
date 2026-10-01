/**
 * Model tampilan Beranda (E04-US01) — murni & isomorfik. Aturan status
 * anggaran memakai `budgetUsage` (E03-US02), tidak menghitung ambang sendiri.
 */
import type { BudgetSummary } from "~/modules/budgets/queries";
import { budgetUsage, type BudgetUsage } from "~/modules/budgets/status";
import type {
  MonthTotals,
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
  /** Transaksi terbaru lintas bulan (keputusan open question design). */
  recent: RecentTransaction[];
  /** Belum punya transaksi sama sekali → empty state (AC 10). */
  isNewUser: boolean;
};

export function buildDashboardView({
  totals,
  budget,
  recent,
}: {
  totals: MonthTotals;
  budget: BudgetSummary;
  recent: RecentTransaction[];
}): DashboardView {
  const net = totals.income - totals.expense;
  return {
    month: totals.month,
    income: totals.income,
    expense: totals.expense,
    net,
    netState: netState(net),
    budget:
      budget.budgetCount > 0
        ? budgetUsage(budget.totalSpent, budget.totalBudget)
        : null,
    recent: recent.slice(0, DASHBOARD_RECENT_LIMIT),
    isNewUser: recent.length === 0,
  };
}
