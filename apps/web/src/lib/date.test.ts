import { describe, expect, it } from "vitest";

import {
  addMonths,
  currentMonthKey,
  currentMonthStart,
  endOfMonth,
  formatDate,
  formatDateOnly,
  formatDayLabel,
  formatMonthKey,
  formatMonthYear,
  parseDateOnly,
  parseMonthKey,
  shiftMonthKey,
  startOfMonth,
  toJakartaDateString,
  today,
} from "./date";

describe("today (Asia/Jakarta)", () => {
  it("memakai kalender WIB, bukan UTC", () => {
    // 30 Sep 2026 18:30 UTC = 1 Okt 2026 01:30 WIB
    const now = new Date("2026-09-30T18:30:00Z");
    expect(toJakartaDateString(now)).toBe("2026-10-01");
    expect(formatDateOnly(today(now))).toBe("2026-10-01");
  });

  it("sebelum tengah malam WIB masih tanggal yang sama", () => {
    const now = new Date("2026-09-30T16:59:59Z"); // 23:59:59 WIB
    expect(formatDateOnly(today(now))).toBe("2026-09-30");
  });

  it("currentMonthStart mengikuti bulan WIB", () => {
    const now = new Date("2026-09-30T18:30:00Z");
    expect(formatDateOnly(currentMonthStart(now))).toBe("2026-10-01");
  });
});

describe("awal & akhir bulan", () => {
  it("startOfMonth / endOfMonth", () => {
    const d = parseDateOnly("2026-09-17");
    expect(formatDateOnly(startOfMonth(d))).toBe("2026-09-01");
    expect(formatDateOnly(endOfMonth(d))).toBe("2026-09-30");
  });

  it("endOfMonth menangani Februari kabisat", () => {
    expect(formatDateOnly(endOfMonth(parseDateOnly("2028-02-10")))).toBe(
      "2028-02-29",
    );
    expect(formatDateOnly(endOfMonth(parseDateOnly("2026-02-10")))).toBe(
      "2026-02-28",
    );
  });

  it("addMonths selalu mengembalikan awal bulan & melewati tahun", () => {
    expect(formatDateOnly(addMonths(parseDateOnly("2026-01-31"), 1))).toBe(
      "2026-02-01",
    );
    expect(formatDateOnly(addMonths(parseDateOnly("2026-01-15"), -1))).toBe(
      "2025-12-01",
    );
  });
});

describe("parseDateOnly", () => {
  it("menolak format / tanggal tidak valid", () => {
    expect(() => parseDateOnly("30-09-2026")).toThrow();
    expect(() => parseDateOnly("2026-02-30")).toThrow();
  });
});

describe("format tampilan", () => {
  it('formatDate → "30 Sep 2026"', () => {
    expect(formatDate(parseDateOnly("2026-09-30"))).toBe("30 Sep 2026");
    expect(formatDate(parseDateOnly("2026-08-05"))).toBe("5 Agu 2026");
    expect(formatDate(parseDateOnly("2026-12-01"))).toBe("1 Des 2026");
  });

  it('formatMonthYear → "September 2026"', () => {
    expect(formatMonthYear(parseDateOnly("2026-09-01"))).toBe("September 2026");
  });
});

describe("formatDayLabel", () => {
  it("nama hari Indonesia + tanggal singkat", () => {
    expect(formatDayLabel(parseDateOnly("2026-09-30"))).toBe(
      "Rabu, 30 Sep 2026",
    );
    expect(formatDayLabel(parseDateOnly("2026-09-27"))).toBe(
      "Minggu, 27 Sep 2026",
    );
    expect(formatDayLabel(parseDateOnly("2026-08-31"))).toBe(
      "Senin, 31 Agu 2026",
    );
  });
});

describe("kunci bulan YYYY-MM", () => {
  it("format, parse, dan geser bulan (lintas tahun)", () => {
    expect(formatMonthKey(parseDateOnly("2026-09-30"))).toBe("2026-09");
    expect(formatDateOnly(parseMonthKey("2026-02"))).toBe("2026-02-01");
    expect(shiftMonthKey("2026-01", -1)).toBe("2025-12");
    expect(shiftMonthKey("2026-12", 1)).toBe("2027-01");
  });

  it("menolak format tidak valid", () => {
    for (const value of ["2026-13", "2026-9", "2026-00", "abc", "2026-09-01"]) {
      expect(() => parseMonthKey(value)).toThrow();
    }
  });

  it("bulan berjalan mengikuti zona Asia/Jakarta", () => {
    expect(currentMonthKey(new Date("2026-09-30T18:30:00Z"))).toBe("2026-10");
    expect(currentMonthKey(new Date("2026-09-30T16:59:59Z"))).toBe("2026-09");
  });
});
