import { describe, expect, it } from "vitest";

import { getDemoCredentials, isDemoMode } from "./demo";

describe("isDemoMode", () => {
  it("aktif hanya bila DEMO_MODE persis 'true'", () => {
    expect(isDemoMode({ DEMO_MODE: "true" })).toBe(true);
  });

  it.each([undefined, "", "false", "TRUE", "1", "yes"])(
    "nonaktif untuk DEMO_MODE=%s",
    (value) => {
      expect(isDemoMode({ DEMO_MODE: value })).toBe(false);
    },
  );
});

describe("getDemoCredentials", () => {
  it("mengembalikan akun demo budi saat mode demo aktif", () => {
    expect(getDemoCredentials({ DEMO_MODE: "true" })).toEqual({
      email: "budi@example.com",
      password: "Password123",
    });
  });

  it("mengembalikan null saat mode demo nonaktif", () => {
    expect(getDemoCredentials({})).toBeNull();
    expect(getDemoCredentials({ DEMO_MODE: "false" })).toBeNull();
  });
});
