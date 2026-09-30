import { describe, expect, it } from "vitest";

import {
  appendTransactionPage,
  cursorOf,
  groupTransactionsByDate,
  type TransactionListItem,
  type TransactionListPage,
} from "./list";

let seq = 0;
function item(
  date: string,
  type: "EXPENSE" | "INCOME",
  amount: number,
  note: string | null = null,
): TransactionListItem {
  seq += 1;
  return {
    id: `00000000-0000-4000-8000-${String(seq).padStart(12, "0")}`,
    type,
    amount: BigInt(amount),
    date,
    note,
    createdAt: `${date}T0${seq % 10}:00:00.000Z`,
    category: { id: "c", name: "Makan & Minum", icon: null, archived: false },
  };
}

describe("groupTransactionsByDate (AC 1)", () => {
  it("mengelompokkan per tanggal dengan urutan tetap & label hari", () => {
    const items = [
      item("2026-09-30", "EXPENSE", 25_000, "Makan siang"),
      item("2026-09-30", "EXPENSE", 18_000, "Ojek"),
      item("2026-09-25", "INCOME", 8_000_000, "Gaji September"),
      item("2026-09-10", "EXPENSE", 350_000, "Listrik"),
    ];
    const groups = groupTransactionsByDate(items);

    expect(groups.map((g) => g.date)).toEqual([
      "2026-09-30",
      "2026-09-25",
      "2026-09-10",
    ]);
    expect(groups[0].label).toBe("Rabu, 30 Sep 2026");
    expect(groups[0].items.map((i) => i.note)).toEqual(["Makan siang", "Ojek"]);
    // Tanpa dayTotals → dijumlah dari baris (pemasukan − pengeluaran).
    expect(groups.map((g) => g.net)).toEqual([
      BigInt(-43_000),
      BigInt(8_000_000),
      BigInt(-350_000),
    ]);
  });

  it("total harian memakai dayTotals server (seluruh transaksi tanggal tsb)", () => {
    const groups = groupTransactionsByDate(
      [item("2026-09-30", "EXPENSE", 10_000)],
      { "2026-09-30": { income: BigInt(5_000), expense: BigInt(70_000) } },
    );
    expect(groups[0].net).toBe(BigInt(-65_000));
  });

  it("daftar kosong → tanpa grup", () => {
    expect(groupTransactionsByDate([])).toEqual([]);
  });
});

describe("appendTransactionPage (infinite scroll)", () => {
  it("menambah baris baru, menggabungkan total harian, memakai cursor terbaru", () => {
    const a = item("2026-09-30", "EXPENSE", 1);
    const b = item("2026-09-29", "EXPENSE", 2);
    const c = item("2026-09-29", "EXPENSE", 3);
    const first: TransactionListPage = {
      items: [a, b],
      dayTotals: { "2026-09-30": { income: BigInt(0), expense: BigInt(1) } },
      nextCursor: cursorOf(b),
    };
    const next: TransactionListPage = {
      // `b` terkirim ulang (mis. race) → tidak diduplikasi.
      items: [b, c],
      dayTotals: { "2026-09-29": { income: BigInt(0), expense: BigInt(5) } },
      nextCursor: null,
    };

    const merged = appendTransactionPage(first, next);
    expect(merged.items.map((i) => i.id)).toEqual([a.id, b.id, c.id]);
    expect(Object.keys(merged.dayTotals)).toEqual(["2026-09-30", "2026-09-29"]);
    expect(merged.nextCursor).toBeNull();
    // Grup "29 Sep" yang terpotong antar halaman tetap satu grup.
    const groups = groupTransactionsByDate(merged.items, merged.dayTotals);
    expect(groups).toHaveLength(2);
    expect(groups[1].items).toHaveLength(2);
    expect(groups[1].net).toBe(BigInt(-5));
  });

  it("cursorOf mengambil (tanggal, createdAt, id)", () => {
    const a = item("2026-09-30", "INCOME", 1);
    expect(cursorOf(a)).toEqual({
      date: a.date,
      createdAt: a.createdAt,
      id: a.id,
    });
  });
});
