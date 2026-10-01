/**
 * Peringatan anggaran (E03-US03) — murni & isomorfik. Semua aturan ambang
 * memakai `./status` (E03-US02); modul ini hanya menentukan KAPAN peringatan
 * muncul (status naik level) dan teksnya.
 */
import {
  budgetBalanceLabel,
  budgetStatus,
  budgetUsage,
  compareBudgetUsage,
  isBudgetStatusRaised,
  type BudgetStatus,
} from "./status";

/** Level peringatan (= status selain Aman). */
export type BudgetAlertLevel = Exclude<BudgetStatus, "safe">;

/**
 * Peringatan toast setelah pengeluaran disimpan — hanya berisi nilai yang bisa
 * diserialisasi (hasil Server Action).
 */
export type BudgetAlert = {
  categoryName: string;
  level: BudgetAlertLevel;
  /** Persen terpakai (dibulatkan ke bawah). */
  percent: number;
  /** "Sisa Rp X" / "Lebih Rp X". */
  balanceLabel: string;
};

export const BUDGET_ALERT_MESSAGES = {
  seeBudget: "Lihat anggaran",
  close: "Tutup peringatan",
} as const;

/**
 * Peringatan untuk satu kategori beranggaran bila pemakaiannya naik level
 * karena penyimpanan (`spentBefore` → `spentAfter`); `null` bila status tetap
 * atau turun. Lompat Aman → Terlampaui hanya menghasilkan level Terlampaui.
 */
export function budgetAlertFor({
  categoryName,
  budget,
  spentBefore,
  spentAfter,
}: {
  categoryName: string;
  budget: bigint;
  spentBefore: bigint;
  spentAfter: bigint;
}): BudgetAlert | null {
  const before = budgetStatus(spentBefore, budget);
  const after = budgetUsage(spentAfter, budget);
  if (after.status === "safe" || !isBudgetStatusRaised(before, after.status)) {
    return null;
  }
  return {
    categoryName,
    level: after.status,
    percent: after.percent,
    balanceLabel: budgetBalanceLabel(after),
  };
}

/** Teks toast, mis. "Anggaran Makan & Minum sudah terpakai 85%. Sisa Rp 225.000." */
export function budgetAlertMessage(alert: BudgetAlert): string {
  return alert.level === "over"
    ? `Anggaran ${alert.categoryName} terlampaui. ${alert.balanceLabel}.`
    : `Anggaran ${alert.categoryName} sudah terpakai ${alert.percent}%. ${alert.balanceLabel}.`;
}

/** Kategori bulan berjalan yang perlu perhatian (banner, AC 8–10). */
export type BudgetAttention = {
  /** Nama kategori Terlampaui (paling kritis dulu). */
  over: string[];
  /** Nama kategori Hampir habis (paling kritis dulu). */
  warning: string[];
};

export type BudgetAttentionRow = {
  name: string;
  spent: bigint;
  budget: bigint;
};

/**
 * Kategori beranggaran berstatus Hampir habis / Terlampaui, urut rasio
 * terpakai tertinggi (seri → urutan masukan). `null` bila tidak ada → banner
 * tidak dirender.
 */
export function budgetAttention(
  rows: readonly BudgetAttentionRow[],
): BudgetAttention | null {
  const sorted = [...rows].sort(compareBudgetUsage);
  const over: string[] = [];
  const warning: string[] = [];
  for (const row of sorted) {
    const status = budgetStatus(row.spent, row.budget);
    if (status === "over") over.push(row.name);
    else if (status === "warning") warning.push(row.name);
  }
  return over.length + warning.length > 0 ? { over, warning } : null;
}

/** Warna banner: merah bila ada minimal satu Terlampaui, selain itu kuning. */
export function budgetAttentionLevel(
  attention: BudgetAttention,
): BudgetAlertLevel {
  return attention.over.length > 0 ? "over" : "warning";
}

/** Banner Beranda: "2 kategori perlu perhatian: 1 terlampaui, 1 hampir habis". */
export function budgetAttentionSummary(attention: BudgetAttention): string {
  const total = attention.over.length + attention.warning.length;
  const parts = [
    attention.over.length > 0 ? `${attention.over.length} terlampaui` : null,
    attention.warning.length > 0
      ? `${attention.warning.length} hampir habis`
      : null,
  ].filter(Boolean);
  return `${total} kategori perlu perhatian: ${parts.join(", ")}`;
}
