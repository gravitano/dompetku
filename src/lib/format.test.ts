import { describe, expect, it } from "vitest";

import { formatRupiah, getInitials } from "./format";

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
