/**
 * Tipe & util daftar transaksi (E02-US03). Isomorfik: dipakai query server
 * (`./queries.ts`), Server Action (`./actions.ts`), dan komponen client.
 */
import { formatDayLabel, parseDateOnly } from "~/lib/date";

import type { TransactionCursor, TransactionType } from "./schema";

/** Satu baris di daftar transaksi. */
export type TransactionListItem = {
  id: string;
  type: TransactionType;
  amount: bigint;
  /** "YYYY-MM-DD" (kalender Asia/Jakarta). */
  date: string;
  note: string | null;
  /** ISO timestamp waktu dicatat (bagian cursor pagination). */
  createdAt: string;
  category: {
    id: string;
    name: string;
    icon: string | null;
    archived: boolean;
  };
};

export type AmountTotals = { income: bigint; expense: bigint };

/** Total pemasukan & pengeluaran per tanggal ("YYYY-MM-DD") sesuai filter. */
export type DayTotals = Record<string, AmountTotals>;

export type TransactionListPage = {
  items: TransactionListItem[];
  /** Total harian (seluruh transaksi tanggal tsb) untuk tanggal di `items`. */
  dayTotals: DayTotals;
  /** `null` bila tidak ada halaman berikutnya. */
  nextCursor: TransactionCursor | null;
};

export type TransactionListSummary = AmountTotals & {
  /** Selisih = pemasukan − pengeluaran. */
  net: bigint;
};

export type TransactionDayGroup = {
  date: string;
  /** "Rabu, 30 Sep 2026". */
  label: string;
  /** Total bersih hari itu (pemasukan − pengeluaran). */
  net: bigint;
  items: TransactionListItem[];
};

const ZERO = BigInt(0);

/** Cursor untuk memuat transaksi setelah `item` (urutan daftar). */
export function cursorOf(item: TransactionListItem): TransactionCursor {
  return { date: item.date, createdAt: item.createdAt, id: item.id };
}

/**
 * Kelompokkan transaksi (sudah terurut tanggal terbaru dulu) per tanggal.
 * Total bersih diambil dari `dayTotals` (seluruh transaksi tanggal tsb), atau
 * dijumlah dari baris yang ada bila tanggal tsb tidak ada di `dayTotals`.
 */
export function groupTransactionsByDate(
  items: readonly TransactionListItem[],
  dayTotals: DayTotals = {},
): TransactionDayGroup[] {
  const groups: TransactionDayGroup[] = [];
  const byDate = new Map<string, TransactionDayGroup>();

  for (const item of items) {
    let group = byDate.get(item.date);
    if (!group) {
      group = {
        date: item.date,
        label: formatDayLabel(parseDateOnly(item.date)),
        net: ZERO,
        items: [],
      };
      byDate.set(item.date, group);
      groups.push(group);
    }
    group.items.push(item);
  }

  for (const group of groups) {
    const totals = dayTotals[group.date];
    group.net = totals
      ? totals.income - totals.expense
      : group.items.reduce(
          (sum, item) =>
            item.type === "INCOME" ? sum + item.amount : sum - item.amount,
          ZERO,
        );
  }
  return groups;
}

/** Gabungkan halaman baru ke daftar yang sudah tampil (tanpa duplikat id). */
export function appendTransactionPage(
  current: TransactionListPage,
  next: TransactionListPage,
): TransactionListPage {
  const seen = new Set(current.items.map((item) => item.id));
  return {
    items: [...current.items, ...next.items.filter((i) => !seen.has(i.id))],
    dayTotals: { ...current.dayTotals, ...next.dayTotals },
    nextCursor: next.nextCursor,
  };
}
