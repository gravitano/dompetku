import { describe, expect, it } from "vitest";

import {
  countActiveFilters,
  detailBackHref,
  normalizeTransactionListFilter,
  parseTransactionListParams,
  TRANSACTION_FILTER_MAX_CATEGORIES,
  transactionListHref,
  transactionDetailHref,
  transactionListSearch,
  transactionPageRequestSchema,
} from "./schema";

const CURRENT = "2026-09";
const MAKAN = "0b5a3c1e-8f2d-4b7a-9c6e-1d2f3a4b5c6d";
const TRANSPORT = "1c6b4d2f-9a3e-4c8b-8d7f-2e3a4b5c6d7e";
const GAJI = "2d7c5e3a-0b4f-4d9c-9e8a-3f4b5c6d7e8f";
const LAIN_USER = "3e8d6f4b-1c5a-4e0d-8f9b-4a5b6c7d8e9f";

describe("parseTransactionListParams (E02-US03 AC 7, 12)", () => {
  it("tanpa parameter → bulan berjalan, semua jenis, semua kategori", () => {
    expect(parseTransactionListParams({}, CURRENT)).toEqual({
      month: CURRENT,
      type: null,
      categoryIds: [],
    });
  });

  it("membaca bulan, jenis, dan kategori (record Next maupun URLSearchParams)", () => {
    const expected = {
      month: "2026-08",
      type: "EXPENSE",
      categoryIds: [MAKAN, TRANSPORT],
    };
    expect(
      parseTransactionListParams(
        { month: "2026-08", type: "expense", category: [MAKAN, TRANSPORT] },
        CURRENT,
      ),
    ).toEqual(expected);
    expect(
      parseTransactionListParams(
        new URLSearchParams(
          `month=2026-08&type=EXPENSE&category=${MAKAN}&category=${TRANSPORT}`,
        ),
        CURRENT,
      ),
    ).toEqual(expected);
  });

  it("kategori dipisah koma, huruf besar dinormalisasi, duplikat dibuang", () => {
    const filter = parseTransactionListParams(
      { category: `${MAKAN},${TRANSPORT.toUpperCase()},${MAKAN}` },
      CURRENT,
    );
    expect(filter.categoryIds).toEqual([MAKAN, TRANSPORT]);
  });

  it("id kategori bukan UUID diabaikan", () => {
    const filter = parseTransactionListParams(
      { category: ["makan", "1 OR 1=1", "", MAKAN] },
      CURRENT,
    );
    expect(filter.categoryIds).toEqual([MAKAN]);
  });

  it(`maksimal ${TRANSACTION_FILTER_MAX_CATEGORIES} kategori`, () => {
    const ids = Array.from(
      { length: 60 },
      (_, i) => `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`,
    );
    const filter = parseTransactionListParams({ category: ids }, CURRENT);
    expect(filter.categoryIds).toHaveLength(TRANSACTION_FILTER_MAX_CATEGORIES);
  });

  it.each([
    ["2026-10", CURRENT, "bulan depan → bulan berjalan"],
    ["2027-01", CURRENT, "tahun depan → bulan berjalan"],
    ["2026-13", CURRENT, "bulan 13 → bulan berjalan"],
    ["2026-9", CURRENT, "format salah → bulan berjalan"],
    ["abc", CURRENT, "teks → bulan berjalan"],
    ["1999-12", "2000-01", "sebelum batas → Januari 2000"],
    ["2026-09", "2026-09", "bulan berjalan tetap"],
    ["2025-12", "2025-12", "bulan lalu tetap"],
  ])("month=%s → %s (%s)", (month, expected) => {
    expect(parseTransactionListParams({ month }, CURRENT).month).toBe(expected);
  });

  it("jenis tak dikenal → Semua; hanya nilai pertama yang dipakai", () => {
    expect(parseTransactionListParams({ type: "all" }, CURRENT).type).toBe(
      null,
    );
    expect(parseTransactionListParams({ type: "transfer" }, CURRENT).type).toBe(
      null,
    );
    expect(
      parseTransactionListParams({ type: ["income", "expense"] }, CURRENT).type,
    ).toBe("INCOME");
  });
});

describe("transactionListHref / transactionListSearch", () => {
  it("default → /transactions tanpa query", () => {
    expect(transactionListHref({ month: CURRENT }, CURRENT)).toBe(
      "/transactions",
    );
    expect(transactionListHref({}, CURRENT)).toBe("/transactions");
  });

  it("filter bulan + kategori untuk tautan dari Laporan (E04-US02)", () => {
    expect(
      transactionListHref(
        { month: "2026-08", type: "EXPENSE", categoryIds: [MAKAN] },
        CURRENT,
      ),
    ).toBe(`/transactions?month=2026-08&type=expense&category=${MAKAN}`);
  });

  it("round-trip: hasil parse dari href sama dengan filter asal", () => {
    const filter = {
      month: "2026-07",
      type: "INCOME" as const,
      categoryIds: [GAJI, MAKAN],
    };
    const search = transactionListSearch(filter, CURRENT);
    expect(
      parseTransactionListParams(new URLSearchParams(search), CURRENT),
    ).toEqual(filter);
  });
});

describe("normalizeTransactionListFilter", () => {
  const categories = [
    { id: MAKAN, type: "EXPENSE" as const },
    { id: TRANSPORT, type: "EXPENSE" as const },
    { id: GAJI, type: "INCOME" as const },
  ];

  it("kategori milik user lain / tidak dikenal dibuang", () => {
    const filter = normalizeTransactionListFilter(
      { month: CURRENT, type: null, categoryIds: [MAKAN, LAIN_USER] },
      categories,
    );
    expect(filter.categoryIds).toEqual([MAKAN]);
  });

  it("jenis dipilih → kategori jenis lain dibuang (UX-07)", () => {
    const filter = normalizeTransactionListFilter(
      { month: CURRENT, type: "INCOME", categoryIds: [MAKAN, GAJI] },
      categories,
    );
    expect(filter).toEqual({
      month: CURRENT,
      type: "INCOME",
      categoryIds: [GAJI],
    });
  });

  it("semua jenis → kategori kedua jenis dipertahankan", () => {
    const filter = normalizeTransactionListFilter(
      { month: CURRENT, type: null, categoryIds: [GAJI, TRANSPORT] },
      categories,
    );
    expect(filter.categoryIds).toEqual([GAJI, TRANSPORT]);
  });
});

describe("countActiveFilters", () => {
  it("jenis + tiap kategori", () => {
    expect(
      countActiveFilters({ month: CURRENT, type: null, categoryIds: [] }),
    ).toBe(0);
    expect(
      countActiveFilters({
        month: CURRENT,
        type: "EXPENSE",
        categoryIds: [MAKAN, TRANSPORT],
      }),
    ).toBe(3);
  });
});

describe("transactionPageRequestSchema", () => {
  const valid = {
    filter: { month: "2026-08", type: "EXPENSE", categoryIds: [MAKAN] },
    cursor: {
      date: "2026-08-31",
      createdAt: "2026-08-31T05:00:00.000Z",
      id: GAJI,
    },
  };

  it("menerima filter + cursor yang valid", () => {
    expect(transactionPageRequestSchema.safeParse(valid).success).toBe(true);
  });

  it.each([
    ["bulan salah", { ...valid, filter: { ...valid.filter, month: "2026-8" } }],
    [
      "bulan masa depan",
      { ...valid, filter: { ...valid.filter, month: "2999-01" } },
    ],
    ["jenis salah", { ...valid, filter: { ...valid.filter, type: "ALL" } }],
    [
      "kategori bukan UUID",
      { ...valid, filter: { ...valid.filter, categoryIds: ["x"] } },
    ],
    [
      "tanggal cursor salah",
      { ...valid, cursor: { ...valid.cursor, date: "2026-02-30" } },
    ],
    [
      "id cursor bukan UUID",
      { ...valid, cursor: { ...valid.cursor, id: "1" } },
    ],
    ["tanpa cursor", { filter: valid.filter }],
  ])("menolak %s", (_, input) => {
    expect(transactionPageRequestSchema.safeParse(input).success).toBe(false);
  });
});

describe("transactionDetailHref / detailBackHref (tombol Kembali detail)", () => {
  const ID = "4f9e7a5c-2d6b-4f1e-9a0c-5b6c7d8e9f0a";

  it("tautan detail membawa penanda from=list + filter daftar", () => {
    expect(transactionDetailHref(ID, { month: CURRENT }, CURRENT)).toBe(
      `/transactions/${ID}?from=list`,
    );
    expect(
      transactionDetailHref(
        ID,
        { month: "2026-08", type: "EXPENSE", categoryIds: [MAKAN] },
        CURRENT,
      ),
    ).toBe(
      `/transactions/${ID}?from=list&month=2026-08&type=expense&category=${MAKAN}`,
    );
  });

  it("dari daftar → kembali ke daftar dengan filter yang sama", () => {
    const href = transactionDetailHref(
      ID,
      { month: "2026-08", categoryIds: [MAKAN] },
      CURRENT,
    );
    const params = new URL(href, "http://x").searchParams;
    expect(detailBackHref(params, "2026-05", CURRENT)).toBe(
      `/transactions?month=2026-08&category=${MAKAN}`,
    );
    expect(detailBackHref({ from: "list" }, "2026-05", CURRENT)).toBe(
      "/transactions",
    );
  });

  it("tanpa penanda (tautan langsung) → daftar bulan transaksi", () => {
    expect(detailBackHref({}, "2026-05", CURRENT)).toBe(
      "/transactions?month=2026-05",
    );
    expect(
      detailBackHref({ month: "2026-01", category: MAKAN }, "2026-05", CURRENT),
    ).toBe("/transactions?month=2026-05");
  });

  it("nilai berbahaya diabaikan — selalu path internal /transactions", () => {
    const href = detailBackHref(
      { from: "list", month: "//evil.com", type: "javascript:x" },
      "2026-05",
      CURRENT,
    );
    expect(href).toBe("/transactions");
  });
});
