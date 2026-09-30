import { describe, expect, it } from "vitest";
import { z } from "zod";

import { fail, fromZodError, ok } from "./action-result";

describe("action-result", () => {
  it("ok membungkus data", () => {
    expect(ok({ id: "1" })).toEqual({ success: true, data: { id: "1" } });
  });

  it("fail membuat error standar", () => {
    expect(fail("NOT_FOUND", "Data tidak ditemukan")).toEqual({
      success: false,
      error: { code: "NOT_FOUND", message: "Data tidak ditemukan" },
    });
  });

  it("fromZodError memetakan issue ke details per field", () => {
    const schema = z.object({
      amount: z.number().positive("Nominal harus lebih dari 0"),
    });
    const parsed = schema.safeParse({ amount: 0 });
    expect(parsed.success).toBe(false);
    if (parsed.success) return;
    expect(fromZodError(parsed.error)).toEqual({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Nominal harus lebih dari 0",
        details: [{ field: "amount", message: "Nominal harus lebih dari 0" }],
      },
    });
  });
});
