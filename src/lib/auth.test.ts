import { describe, expect, it, vi } from "vitest";

vi.mock("~/lib/prisma", () => ({ prisma: {} }));

const { auth, SESSION_EXPIRES_IN_SECONDS, SESSION_UPDATE_AGE_SECONDS } =
  await import("./auth");

describe("konfigurasi session better-auth (E01-US02 AC 7)", () => {
  it("sesi 7 hari, diperpanjang otomatis (sliding) tiap 1 hari aktif", () => {
    expect(SESSION_EXPIRES_IN_SECONDS).toBe(7 * 24 * 60 * 60);
    expect(SESSION_UPDATE_AGE_SECONDS).toBe(24 * 60 * 60);
    expect(auth.options.session).toMatchObject({
      expiresIn: SESSION_EXPIRES_IN_SECONDS,
      updateAge: SESSION_UPDATE_AGE_SECONDS,
    });
    // Sliding: jangan matikan refresh session.
    expect(auth.options.session).not.toHaveProperty("disableSessionRefresh");
  });

  it("hook lockout terpasang untuk sign-in", () => {
    expect(auth.options.hooks?.before).toBeTypeOf("function");
    expect(auth.options.hooks?.after).toBeTypeOf("function");
  });
});
