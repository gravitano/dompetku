/**
 * Status pemakaian anggaran (E03-US02) — murni & isomorfik, satu-satunya sumber
 * aturan ambang untuk halaman Anggaran, peringatan (E03-US03), dan Beranda
 * (E04-US01). Semua hitungan memakai BigInt (Rupiah penuh) agar nilai batas
 * seperti 79,99% / 80% / 99,99% / 100% tidak terkena error floating point.
 *
 * - **Aman** (`safe`, hijau): terpakai < 80% anggaran.
 * - **Hampir habis** (`warning`, kuning): 80% s.d. < 100%.
 * - **Terlampaui** (`over`, merah): ≥ 100%.
 *
 * Persentase tampilan dibulatkan ke bawah (79,6% → 79), status memakai nilai
 * sebenarnya.
 */
import { formatRupiah } from "~/lib/format";

/** Ambang "Hampir habis" (persen). */
export const BUDGET_WARNING_PERCENT = 80;
/** Ambang "Terlampaui" (persen). */
export const BUDGET_OVER_PERCENT = 100;

export type BudgetStatus = "safe" | "warning" | "over";

/** Urutan level status — untuk deteksi "naik level" (E03-US03). */
export const BUDGET_STATUS_LEVEL: Record<BudgetStatus, number> = {
  safe: 0,
  warning: 1,
  over: 2,
};

/** Nilai `data-status` (asersi E2E) / nama warna. */
export const BUDGET_STATUS_COLOR = {
  safe: "green",
  warning: "yellow",
  over: "red",
} as const satisfies Record<BudgetStatus, string>;

export type BudgetStatusColor = (typeof BUDGET_STATUS_COLOR)[BudgetStatus];

/** Label status (teks pendamping warna, juga untuk pembaca layar). */
export const BUDGET_STATUS_LABEL: Record<BudgetStatus, string> = {
  safe: "Aman",
  warning: "Hampir habis",
  over: "Terlampaui",
};

const ZERO = BigInt(0);
const HUNDRED = BigInt(100);

/**
 * Status dari nilai sebenarnya. Anggaran ≤ 0 (tidak ada anggaran): pengeluaran
 * 0 → Aman, pengeluaran > 0 → Terlampaui.
 */
export function budgetStatus(spent: bigint, budget: bigint): BudgetStatus {
  if (budget <= ZERO) return spent > ZERO ? "over" : "safe";
  if (spent >= budget) return "over";
  if (spent * HUNDRED >= budget * BigInt(BUDGET_WARNING_PERCENT)) {
    return "warning";
  }
  return "safe";
}

/**
 * Persentase terpakai untuk tampilan, dibulatkan ke bawah (bisa > 100).
 * Anggaran ≤ 0: 0 bila belum ada pengeluaran, selain itu 100.
 */
export function budgetPercent(spent: bigint, budget: bigint): number {
  if (budget <= ZERO) return spent > ZERO ? BUDGET_OVER_PERCENT : 0;
  if (spent <= ZERO) return 0;
  return Number((spent * HUNDRED) / budget);
}

export type BudgetUsage = {
  spent: bigint;
  budget: bigint;
  /** Persen tampilan (dibulatkan ke bawah, bisa > 100). */
  percent: number;
  status: BudgetStatus;
  /** Sisa anggaran (≥ 0). */
  remaining: bigint;
  /** Kelebihan pemakaian (> 0 hanya bila terpakai melebihi anggaran). */
  overBy: bigint;
  /** Lebar progress bar 0–100 (penuh bila terlampaui). */
  barPercent: number;
};

/** Ringkasan pemakaian satu anggaran (atau total). */
export function budgetUsage(spent: bigint, budget: bigint): BudgetUsage {
  const status = budgetStatus(spent, budget);
  const percent = budgetPercent(spent, budget);
  const diff = budget - spent;
  return {
    spent,
    budget,
    percent,
    status,
    remaining: diff > ZERO ? diff : ZERO,
    overBy: diff < ZERO ? -diff : ZERO,
    barPercent: status === "over" ? 100 : Math.min(percent, 100),
  };
}

/** "Sisa Rp X" atau "Lebih Rp X" (terpakai melebihi anggaran). */
export function budgetBalanceLabel(usage: BudgetUsage): string {
  return usage.overBy > ZERO
    ? `Lebih ${formatRupiah(usage.overBy)}`
    : `Sisa ${formatRupiah(usage.remaining)}`;
}

/**
 * Urutan baris: rasio terpakai/anggaran sebenarnya tertinggi dulu (bukan persen
 * yang sudah dibulatkan). Anggaran ≤ 0 dianggap paling kritis bila ada
 * pengeluaran.
 */
export function compareBudgetUsage(
  a: Pick<BudgetUsage, "spent" | "budget">,
  b: Pick<BudgetUsage, "spent" | "budget">,
): number {
  const aInfinite = a.budget <= ZERO && a.spent > ZERO;
  const bInfinite = b.budget <= ZERO && b.spent > ZERO;
  if (aInfinite || bInfinite) return Number(bInfinite) - Number(aInfinite);
  const aBudget = a.budget > ZERO ? a.budget : BigInt(1);
  const bBudget = b.budget > ZERO ? b.budget : BigInt(1);
  // a.spent / aBudget vs b.spent / bBudget, tanpa pembagian.
  const left = a.spent * bBudget;
  const right = b.spent * aBudget;
  if (left === right) return 0;
  return left > right ? -1 : 1;
}

/** `true` bila status naik level (Aman → Hampir habis/Terlampaui, dst.). */
export function isBudgetStatusRaised(
  before: BudgetStatus,
  after: BudgetStatus,
): boolean {
  return BUDGET_STATUS_LEVEL[after] > BUDGET_STATUS_LEVEL[before];
}
