import { describe, expect, it } from "vitest";

import {
  buildExpenseCategoryReport,
  categoryColor,
  OTHER_SLICE_KEY,
  parseReportMonthParam,
  percentTenths,
  reportsHref,
  type CategoryExpense,
} from "./view";

const CURRENT = "2026-10";
const SEP = "2026-09";

let seq = 0;
function expense(
  name: string,
  amount: number,
  extra: Partial<CategoryExpense> = {},
): CategoryExpense {
  seq += 1;
  return {
    categoryId: `00000000-0000-4000-8000-${String(seq).padStart(12, "0")}`,
    name,
    icon: "package",
    archived: false,
    amount: BigInt(amount),
    ...extra,
  };
}

const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);

describe("percentTenths", () => {
  it("dibulatkan ke 1 desimal (testing.md: 50/25/15/10)", () => {
    expect(
      percentTenths([1_000_000, 500_000, 300_000, 200_000].map(BigInt)),
    ).toEqual([500, 250, 150, 100]);
  });

  it("tiga kategori sama besar → 33,3% masing-masing (total 99,9%)", () => {
    expect(percentTenths([100_000, 100_000, 100_000].map(BigInt))).toEqual([
      333, 333, 333,
    ]);
  });

  it("half-up: 1/8 = 12,5%", () => {
    expect(percentTenths([1, 7].map(BigInt))).toEqual([125, 875]);
  });

  it("satu kategori → 100,0%; total 0 → semua 0", () => {
    expect(percentTenths([BigInt(25_000)])).toEqual([1000]);
    expect(percentTenths([BigInt(0), BigInt(0)])).toEqual([0, 0]);
  });

  it("banyak kategori: selisih pembulatan dikoreksi hingga ≤ 0,1 poin", () => {
    // 7 × 1/7 = 14,2857% → 14,3 × 7 = 100,1 (masih dalam toleransi).
    const sevenths = percentTenths(Array.from({ length: 7 }, () => BigInt(1)));
    expect(Math.abs(sum(sevenths) - 1000)).toBeLessThanOrEqual(1);
    // 12 kategori kecil yang semuanya dibulatkan ke atas (+0,04 masing-masing).
    const amounts = [...Array.from({ length: 12 }, () => 46), 9448].map(BigInt);
    const raw = percentTenths(amounts);
    expect(Math.abs(sum(raw) - 1000)).toBeLessThanOrEqual(1);
    // 12 kategori kecil yang semuanya dibulatkan ke bawah.
    const down = percentTenths(
      [...Array.from({ length: 12 }, () => 44), 9472].map(BigInt),
    );
    expect(Math.abs(sum(down) - 1000)).toBeLessThanOrEqual(1);
  });

  it("presisi BigInt untuk total besar", () => {
    const big = BigInt("9007199254740993"); // > Number.MAX_SAFE_INTEGER
    expect(percentTenths([big, big])).toEqual([500, 500]);
  });
});

describe("buildExpenseCategoryReport", () => {
  const sept = () => [
    expense("Tagihan", 300_000),
    expense("Hiburan", 200_000, { archived: true, icon: "clapperboard" }),
    expense("Makan & Minum", 1_000_000, { icon: "utensils" }),
    expense("Transportasi", 500_000),
  ];

  it("urut nominal terbesar, nominal & persentase, total (testing.md)", () => {
    const report = buildExpenseCategoryReport(SEP, sept(), CURRENT);
    expect(report.monthLabel).toBe("September 2026");
    expect(report.total).toBe("2000000");
    expect(
      report.items.map((i) => [i.name, i.amount, i.percentTenths, i.key]),
    ).toEqual([
      ["Makan & Minum", "1000000", 500, "makan-minum"],
      ["Transportasi", "500000", 250, "transportasi"],
      ["Tagihan", "300000", 150, "tagihan"],
      ["Hiburan", "200000", 100, "hiburan"],
    ]);
    // Jumlah nominal di daftar = total (AC 6).
    expect(report.items.reduce((s, i) => s + BigInt(i.amount), BigInt(0))).toBe(
      BigInt(report.total),
    );
  });

  it("kategori terarsip tetap tampil dengan penanda archived (AC 5)", () => {
    const report = buildExpenseCategoryReport(SEP, sept(), CURRENT);
    const hiburan = report.items.find((i) => i.name === "Hiburan");
    expect(hiburan?.archived).toBe(true);
    expect(report.slices.map((s) => s.key)).toContain("hiburan");
  });

  it("kategori tanpa pengeluaran (0) tidak muncul; bulan kosong → tanpa item", () => {
    const report = buildExpenseCategoryReport(
      SEP,
      [expense("Belanja", 0), expense("Tagihan", 10_000)],
      CURRENT,
    );
    expect(report.items.map((i) => i.name)).toEqual(["Tagihan"]);
    const empty = buildExpenseCategoryReport(SEP, [], CURRENT);
    expect(empty).toMatchObject({ total: "0", items: [], slices: [] });
  });

  it("seri nominal → urut nama", () => {
    const report = buildExpenseCategoryReport(
      CURRENT,
      [expense("Transportasi", 100), expense("Belanja", 100)],
      CURRENT,
    );
    expect(report.items.map((i) => i.name)).toEqual([
      "Belanja",
      "Transportasi",
    ]);
  });

  it("tautan daftar transaksi terfilter kategori + bulan (AC 7)", () => {
    const items = sept();
    const report = buildExpenseCategoryReport(SEP, items, CURRENT);
    const makan = items.find((i) => i.name === "Makan & Minum")!;
    expect(report.items[0].href).toBe(
      `/transactions?month=${SEP}&category=${makan.categoryId}`,
    );
    // Bulan berjalan → tanpa ?month= (default daftar transaksi).
    const now = buildExpenseCategoryReport(CURRENT, [makan], CURRENT);
    expect(now.items[0].href).toBe(
      `/transactions?category=${makan.categoryId}`,
    );
  });

  it("warna per urutan, irisan donut sama dengan daftar", () => {
    const report = buildExpenseCategoryReport(SEP, sept(), CURRENT);
    expect(report.items.map((i) => i.color)).toEqual([
      "var(--category-1)",
      "var(--category-2)",
      "var(--category-3)",
      "var(--category-4)",
    ]);
    expect(report.slices.map((s) => [s.key, s.color, s.value])).toEqual(
      report.items.map((i) => [i.key, i.color, Number(i.amount)]),
    );
  });

  it("slug bentrok (nama sama aktif & terarsip) → kunci unik", () => {
    const report = buildExpenseCategoryReport(
      SEP,
      [
        expense("Hiburan", 200, { archived: true }),
        expense("Hiburan", 100),
        expense("Lainnya", 50),
      ],
      CURRENT,
    );
    expect(report.items.map((i) => i.key)).toEqual([
      "hiburan",
      "hiburan-2",
      "lainnya-2",
    ]);
  });

  it("> 8 kategori → 7 terbesar + irisan 'Lainnya'; daftar tetap lengkap", () => {
    const items = Array.from({ length: 10 }, (_, i) =>
      expense(`Kategori ${String.fromCharCode(65 + i)}`, (10 - i) * 1000),
    );
    const report = buildExpenseCategoryReport(SEP, items, CURRENT);
    expect(report.items).toHaveLength(10);
    expect(report.slices).toHaveLength(8);
    const other = report.slices.at(-1)!;
    expect(other).toMatchObject({
      key: OTHER_SLICE_KEY,
      name: "Lainnya",
      amount: String(3000 + 2000 + 1000),
      color: categoryColor(null),
      categoryCount: 3,
    });
    expect(other.percentTenths).toBe(
      sum(report.items.slice(7).map((i) => i.percentTenths)),
    );
    // Baris yang digabung memakai warna "Lainnya" (sama dengan irisannya).
    expect(report.items.slice(7).every((i) => i.color === other.color)).toBe(
      true,
    );
    const ids = items.slice(7).map((i) => `category=${i.categoryId}`);
    expect(other.href).toBe(`/transactions?month=${SEP}&${ids.join("&")}`);
  });

  it("tepat 8 kategori → tanpa 'Lainnya'", () => {
    const items = Array.from({ length: 8 }, (_, i) =>
      expense(`K${i}`, 100 - i),
    );
    const report = buildExpenseCategoryReport(SEP, items, CURRENT);
    expect(report.slices).toHaveLength(8);
    expect(report.slices.some((s) => s.key === OTHER_SLICE_KEY)).toBe(false);
  });
});

describe("parseReportMonthParam / reportsHref", () => {
  it.each([
    [undefined, CURRENT],
    ["2026-09", "2026-09"],
    ["2026-11", CURRENT],
    ["2026-13", CURRENT],
    ["abc", CURRENT],
    ["1999-12", "2000-01"],
    [["2026-08", "2026-07"], "2026-08"],
  ])("%s → %s", (raw, expected) => {
    expect(parseReportMonthParam(raw, CURRENT)).toBe(expected);
  });

  it("bulan berjalan tanpa ?month=", () => {
    expect(reportsHref(CURRENT, CURRENT)).toBe("/reports");
    expect(reportsHref(SEP, CURRENT)).toBe("/reports?month=2026-09");
  });
});
