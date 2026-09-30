import { describe, expect, it } from "vitest";

import { buildLoginUrl, isAuthPage, sanitizeCallbackUrl } from "./callback-url";

describe("sanitizeCallbackUrl", () => {
  it.each([
    ["/budgets", "/budgets"],
    ["/transactions?month=2026-09", "/transactions?month=2026-09"],
    ["/reports#ringkasan", "/reports#ringkasan"],
    ["/", "/"],
  ])("menerima path internal %s", (input, expected) => {
    expect(sanitizeCallbackUrl(input)).toBe(expected);
  });

  it.each([
    undefined,
    null,
    123,
    "",
    "budgets",
    "https://evil.example.com",
    "http://localhost:3000/budgets",
    "//evil.example.com",
    "//evil.example.com/budgets",
    "/\\evil.example.com",
    "/\\/evil.example.com",
    "\\\\evil.example.com",
    "javascript:alert(1)",
    "/\tevil",
    "/login",
    "/login?callbackUrl=/budgets",
    "/register",
    "/api/auth/sign-out",
    `/${"a".repeat(2100)}`,
  ])("menolak %j → Beranda", (input) => {
    expect(sanitizeCallbackUrl(input)).toBe("/");
  });

  it("path ter-encode tetap relatif ke origin sendiri", () => {
    expect(sanitizeCallbackUrl("/%2F%2Fevil.example.com")).toBe(
      "/%2F%2Fevil.example.com",
    );
  });

  it("menormalkan path traversal tanpa keluar dari origin", () => {
    expect(sanitizeCallbackUrl("/budgets/../transactions")).toBe(
      "/transactions",
    );
    expect(sanitizeCallbackUrl("/../../login")).toBe("/");
  });
});

describe("isAuthPage", () => {
  it.each([
    ["/login", true],
    ["/login/extra", true],
    ["/register", true],
    ["/loginx", false],
    ["/", false],
    ["/budgets", false],
  ])("%s → %s", (path, expected) => {
    expect(isAuthPage(path)).toBe(expected);
  });
});

describe("buildLoginUrl", () => {
  it("menyertakan callbackUrl ter-encode", () => {
    expect(buildLoginUrl("/budgets")).toBe("/login?callbackUrl=%2Fbudgets");
    expect(buildLoginUrl("/transactions?month=2026-09")).toBe(
      "/login?callbackUrl=%2Ftransactions%3Fmonth%3D2026-09",
    );
  });

  it("tanpa callbackUrl untuk Beranda atau nilai tidak aman", () => {
    expect(buildLoginUrl("/")).toBe("/login");
    expect(buildLoginUrl(null)).toBe("/login");
    expect(buildLoginUrl(undefined)).toBe("/login");
    expect(buildLoginUrl("https://evil.example.com")).toBe("/login");
  });
});
