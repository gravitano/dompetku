import { describe, expect, it } from "vitest";

import {
  BUDGET_MESSAGES as M,
  budgetAmountSchema,
  budgetMaxMonth,
  budgetMonthError,
  budgetRefSchema,
  budgetSetSchema,
  budgetsHref,
  isBudgetMonthEditable,
  parseBudgetMonthParam,
} from "./schema";

const CURRENT = "2026-10";

describe("budgetAmountSchema", () => {
  it.each([
    ["1", 1],
    ["1500000", 1_500_000],
    [" 750000 ", 750_000],
    ["1000000000", 1_000_000_000],
  ])("nominal %j valid → %d", (input, expected) => {
    expect(budgetAmountSchema.parse(input)).toBe(expected);
  });

  it.each([
    ["", M.amountRequired],
    ["   ", M.amountRequired],
    ["0", M.amountMin],
    ["000", M.amountMin],
    ["1000000001", M.amountMax],
    ["12a", M.amountInvalid],
    ["-5", M.amountInvalid],
  ])("nominal %j ditolak: %s", (input, message) => {
    const result = budgetAmountSchema.safeParse(input);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe(message);
  });

  it("pesan sesuai design", () => {
    expect(M.amountRequired).toBe("Nominal wajib diisi");
    expect(M.amountMin).toBe("Nominal harus lebih dari 0");
    expect(M.amountMax).toBe("Nominal maksimal Rp 1.000.000.000");
  });

  it("bukan string → Nominal wajib diisi", () => {
    expect(
      budgetAmountSchema.safeParse(undefined).error?.issues[0]?.message,
    ).toBe(M.amountRequired);
  });
});

describe("budgetSetSchema / budgetRefSchema", () => {
  const categoryId = "00000000-0000-4000-8000-000000000001";

  it("valid: kategori UUID, bulan YYYY-MM, nominal digit", () => {
    expect(
      budgetSetSchema.parse({ categoryId, month: "2026-10", amount: "600000" }),
    ).toEqual({ categoryId, month: "2026-10", amount: 600_000 });
  });

  it.each(["2026-13", "2026-1", "202610", "", undefined])(
    "bulan %j tidak valid",
    (month) => {
      expect(budgetRefSchema.safeParse({ categoryId, month }).success).toBe(
        false,
      );
    },
  );

  it("kategori bukan UUID ditolak", () => {
    expect(
      budgetRefSchema.safeParse({ categoryId: "cat-1", month: "2026-10" })
        .success,
    ).toBe(false);
  });
});

describe("aturan bulan", () => {
  it("maksimal 1 bulan ke depan, termasuk lintas tahun", () => {
    expect(budgetMaxMonth("2026-10")).toBe("2026-11");
    expect(budgetMaxMonth("2026-12")).toBe("2027-01");
  });

  it.each([
    ["2026-09", false],
    ["2026-10", true],
    ["2026-11", true],
    ["2026-12", false],
    ["2025-10", false],
  ])("bulan %s bisa diubah: %s", (month, editable) => {
    expect(isBudgetMonthEditable(month, CURRENT)).toBe(editable);
  });

  it("pesan bulan lampau / terlalu jauh", () => {
    expect(budgetMonthError("2026-09", CURRENT)).toBe(M.monthPast);
    expect(budgetMonthError("2026-12", CURRENT)).toBe(M.monthTooFar);
    expect(budgetMonthError("2026-10", CURRENT)).toBeNull();
    expect(budgetMonthError("2026-11", CURRENT)).toBeNull();
  });

  it.each([
    [undefined, "2026-10"],
    ["", "2026-10"],
    ["oktober", "2026-10"],
    ["2026-13", "2026-10"],
    ["2026-09", "2026-09"],
    ["2026-11", "2026-11"],
    ["2026-12", "2026-11"],
    ["2099-01", "2026-11"],
    ["1999-12", "2000-01"],
    [["2026-08", "2026-09"], "2026-08"],
  ])("param ?month=%j → %s", (value, expected) => {
    expect(parseBudgetMonthParam(value, CURRENT)).toBe(expected);
  });

  it("tautan: bulan berjalan tanpa ?month=", () => {
    expect(budgetsHref("2026-10", CURRENT)).toBe("/budgets");
    expect(budgetsHref(undefined, CURRENT)).toBe("/budgets");
    expect(budgetsHref("2026-11", CURRENT)).toBe("/budgets?month=2026-11");
  });
});
