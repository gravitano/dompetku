import { describe, expect, it } from "vitest";

import {
  AMOUNT_INPUT_MAX_DIGITS,
  formatAmountInput,
  formatPercentTenths,
  formatRupiah,
  formatRupiahShort,
  getInitials,
  parseAmountInput,
} from "./format";

describe("formatRupiah", () => {
  it.each([
    [0, "Rp 0"],
    [500, "Rp 500"],
    [25_000, "Rp 25.000"],
    [1_250_000, "Rp 1.250.000"],
    [8_000_000, "Rp 8.000.000"],
  ])("number %d → %s", (input, expected) => {
    expect(formatRupiah(input)).toBe(expected);
  });

  it("mendukung bigint besar tanpa kehilangan presisi", () => {
    expect(formatRupiah(BigInt("9007199254740993"))).toBe(
      "Rp 9.007.199.254.740.993",
    );
  });

  it("nilai negatif diberi tanda minus di depan", () => {
    expect(formatRupiah(-25_000)).toBe("-Rp 25.000");
    expect(formatRupiah(BigInt(-1_000))).toBe("-Rp 1.000");
  });

  it("number desimal dibulatkan ke bawah (Rupiah penuh)", () => {
    expect(formatRupiah(25_000.9)).toBe("Rp 25.000");
  });
});

describe("getInitials", () => {
  it.each([
    ["Budi Santoso", "BS"],
    ["budi", "B"],
    ["  Ani  Wijaya  Putri ", "AP"],
    ["", "?"],
    ["   ", "?"],
  ])("%j → %s", (name, expected) => {
    expect(getInitials(name)).toBe(expected);
  });
});

describe("parseAmountInput", () => {
  it.each([
    ["", ""],
    ["Rp ", ""],
    ["25000", "25000"],
    ["Rp 1.500.000", "1500000"],
    ["Rp 1.500.0009", "15000009"],
    ["0", "0"],
    ["000", "0"],
    ["007", "7"],
    ["abc", ""],
    ["-5", "5"],
    ["1,5", "1"],
  ])("%j → %j", (input, expected) => {
    expect(parseAmountInput(input)).toBe(expected);
  });

  describe("paste nominal (bagian desimal di akhir diabaikan)", () => {
    it.each([
      ["Rp 25.000,00", "25000"],
      ["Rp25.000,00", "25000"],
      ["1.500.000,50", "1500000"],
      ["Rp 1.500.000,5", "1500000"],
      ["  Rp 8.000.000,00  ", "8000000"],
      ["Rp 25.000,-", "25000"],
      ["Rp 25.000", "25000"],
      ["25.000", "25000"],
      ["25000", "25000"],
      ["Rp 1 500 000", "1500000"],
      ["IDR 1.000.000", "1000000"],
      ["25,000", "25000"],
      ["1,000,000", "1000000"],
      ["0,50", "0"],
      [",50", ""],
      ["Rp 25.000,", "25000"],
    ])("%j → %j", (input, expected) => {
      expect(parseAmountInput(input)).toBe(expected);
    });
  });

  it(`maksimal ${AMOUNT_INPUT_MAX_DIGITS} digit`, () => {
    expect(parseAmountInput("12345678901234567")).toBe("1234567890123");
  });
});

describe("formatAmountInput", () => {
  it.each([
    ["", ""],
    ["0", "Rp 0"],
    ["25000", "Rp 25.000"],
    ["1500000", "Rp 1.500.000"],
    ["1000000001", "Rp 1.000.000.001"],
  ])("%j → %j", (input, expected) => {
    expect(formatAmountInput(input)).toBe(expected);
  });
});

describe("formatRupiahShort (label chart E04-US02)", () => {
  it.each([
    [0, "Rp 0"],
    [900, "Rp 900"],
    [1_000, "Rp 1 rb"],
    [25_000, "Rp 25 rb"],
    [500_000, "Rp 500 rb"],
    [999_400, "Rp 999,4 rb"],
    [999_960, "Rp 1 jt"],
    [1_000_000, "Rp 1 jt"],
    [1_250_000, "Rp 1,3 jt"],
    [1_240_000, "Rp 1,2 jt"],
    [2_000_000, "Rp 2 jt"],
    [12_345_678, "Rp 12,3 jt"],
    [1_500_000_000, "Rp 1,5 M"],
    [2_000_000_000_000, "Rp 2 T"],
    [1_234_000_000_000_000, "Rp 1.234 T"],
    [-1_500_000, "-Rp 1,5 jt"],
  ])("%d → %s", (value, expected) => {
    expect(formatRupiahShort(value)).toBe(expected);
    expect(formatRupiahShort(BigInt(value))).toBe(expected);
  });
});

describe("formatPercentTenths", () => {
  it.each([
    [0, "0,0%"],
    [5, "0,5%"],
    [125, "12,5%"],
    [333, "33,3%"],
    [1000, "100,0%"],
  ])("%d → %s", (tenths, expected) => {
    expect(formatPercentTenths(tenths)).toBe(expected);
  });
});
