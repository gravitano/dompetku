import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  NOTE_MAX_LENGTH,
  TRANSACTION_MESSAGES as M,
  transactionSchema,
} from "./schema";

const CATEGORY_ID = "0b5a3c1e-8f2d-4b7a-9c6e-1d2f3a4b5c6d";

const valid = {
  type: "EXPENSE",
  amount: "25000",
  categoryId: CATEGORY_ID,
  transactionDate: "2026-09-30",
  note: "Makan siang",
};

function fieldErrors(input: unknown) {
  const result = transactionSchema.safeParse(input);
  if (result.success) return {};
  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const field = issue.path.join(".");
    errors[field] ??= issue.message;
  }
  return errors;
}

describe("transactionSchema", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // 30 Sep 2026 10:00 WIB
    vi.setSystemTime(new Date("2026-09-30T03:00:00Z"));
  });
  afterEach(() => vi.useRealTimers());

  it("data valid → nominal number, catatan di-trim", () => {
    expect(
      transactionSchema.parse({ ...valid, note: "  Makan siang  " }),
    ).toEqual({
      type: "EXPENSE",
      amount: 25_000,
      categoryId: CATEGORY_ID,
      transactionDate: "2026-09-30",
      note: "Makan siang",
    });
  });

  it.each([undefined, "", "   "])("catatan %j → null", (note) => {
    expect(transactionSchema.parse({ ...valid, note }).note).toBeNull();
  });

  it("menerima jenis INCOME (dipakai E02-US02)", () => {
    expect(transactionSchema.parse({ ...valid, type: "INCOME" }).type).toBe(
      "INCOME",
    );
  });

  it("menolak jenis lain", () => {
    expect(fieldErrors({ ...valid, type: "TRANSFER" })).toEqual({
      type: M.typeInvalid,
    });
  });

  describe("nominal", () => {
    it.each([
      ["", M.amountRequired],
      ["  ", M.amountRequired],
      ["0", M.amountMin],
      ["000", M.amountMin],
      ["1000000001", M.amountMax],
      ["99999999999999999999", M.amountMax],
      ["-5", M.amountInvalid],
      ["1.5", M.amountInvalid],
      ["Rp 5", M.amountInvalid],
    ])("%j → %s", (amount, message) => {
      expect(fieldErrors({ ...valid, amount })).toEqual({ amount: message });
    });

    it("tanpa nominal → wajib diisi", () => {
      expect(fieldErrors({ ...valid, amount: undefined })).toEqual({
        amount: M.amountRequired,
      });
    });

    it.each([
      ["1", 1],
      ["1000000000", 1_000_000_000],
    ])("batas %j valid", (amount, expected) => {
      expect(transactionSchema.parse({ ...valid, amount }).amount).toBe(
        expected,
      );
    });
  });

  describe("kategori", () => {
    it.each([undefined, ""])("%j → Pilih kategori", (categoryId) => {
      expect(fieldErrors({ ...valid, categoryId })).toEqual({
        categoryId: M.categoryRequired,
      });
    });

    it("bukan UUID → kategori tidak valid", () => {
      expect(fieldErrors({ ...valid, categoryId: "makan" })).toEqual({
        categoryId: M.categoryInvalid,
      });
    });
  });

  describe("tanggal", () => {
    it("hari ini & kemarin valid", () => {
      expect(transactionSchema.safeParse(valid).success).toBe(true);
      expect(
        transactionSchema.safeParse({
          ...valid,
          transactionDate: "2026-09-29",
        }).success,
      ).toBe(true);
    });

    it("besok ditolak", () => {
      expect(fieldErrors({ ...valid, transactionDate: "2026-10-01" })).toEqual({
        transactionDate: M.dateFuture,
      });
    });

    it("memakai kalender Asia/Jakarta (sudah tanggal 1 di WIB, masih 30 di UTC)", () => {
      vi.setSystemTime(new Date("2026-09-30T18:00:00Z")); // 1 Okt 01:00 WIB
      expect(
        transactionSchema.safeParse({
          ...valid,
          transactionDate: "2026-10-01",
        }).success,
      ).toBe(true);
    });

    it.each([
      ["", M.dateRequired],
      ["30/09/2026", M.dateInvalid],
      ["2026-02-30", M.dateInvalid],
      ["1999-12-31", M.dateInvalid],
    ])("%j → %s", (transactionDate, message) => {
      expect(fieldErrors({ ...valid, transactionDate })).toEqual({
        transactionDate: message,
      });
    });
  });

  it(`catatan maksimal ${NOTE_MAX_LENGTH} karakter`, () => {
    expect(
      transactionSchema.safeParse({
        ...valid,
        note: "a".repeat(NOTE_MAX_LENGTH),
      }).success,
    ).toBe(true);
    expect(
      fieldErrors({ ...valid, note: "a".repeat(NOTE_MAX_LENGTH + 1) }),
    ).toEqual({ note: M.noteTooLong });
  });

  it("melaporkan semua field yang tidak valid sekaligus", () => {
    expect(
      Object.keys(
        fieldErrors({
          type: "EXPENSE",
          amount: "",
          categoryId: "",
          transactionDate: "2026-10-01",
        }),
      ).sort(),
    ).toEqual(["amount", "categoryId", "transactionDate"]);
  });
});
