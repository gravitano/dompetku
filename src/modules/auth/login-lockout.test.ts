import { describe, expect, it } from "vitest";

import {
  createLoginLockout,
  LOGIN_LOCK_WINDOW_MS,
  LOGIN_MAX_FAILURES,
  readSignInEmail,
} from "./login-lockout";

function setup() {
  let time = 1_000_000;
  const lockout = createLoginLockout({ now: () => time });
  return {
    lockout,
    advance: (ms: number) => {
      time += ms;
    },
  };
}

const EMAIL = "lock@example.com";

describe("createLoginLockout", () => {
  it("batasnya 5 kali gagal dalam 15 menit", () => {
    expect(LOGIN_MAX_FAILURES).toBe(5);
    expect(LOGIN_LOCK_WINDOW_MS).toBe(15 * 60 * 1000);
  });

  it("terkunci setelah 5 kali gagal untuk email yang sama", () => {
    const { lockout } = setup();
    for (let i = 1; i < LOGIN_MAX_FAILURES; i++) {
      expect(lockout.recordFailure(EMAIL).locked).toBe(false);
      expect(lockout.status(EMAIL).locked).toBe(false);
    }
    expect(lockout.recordFailure(EMAIL)).toEqual({
      locked: true,
      retryAfterMs: LOGIN_LOCK_WINDOW_MS,
    });
    expect(lockout.status(EMAIL).locked).toBe(true);
  });

  it("email dinormalisasi (huruf besar/kecil & spasi)", () => {
    const { lockout } = setup();
    for (let i = 0; i < LOGIN_MAX_FAILURES; i++) {
      lockout.recordFailure(i % 2 ? " Lock@Example.COM " : EMAIL);
    }
    expect(lockout.status("LOCK@example.com").locked).toBe(true);
  });

  it("tidak mempengaruhi email lain", () => {
    const { lockout } = setup();
    for (let i = 0; i < LOGIN_MAX_FAILURES; i++) lockout.recordFailure(EMAIL);
    expect(lockout.status("budi@example.com").locked).toBe(false);
  });

  it("terbuka kembali setelah 15 menit", () => {
    const { lockout, advance } = setup();
    for (let i = 0; i < LOGIN_MAX_FAILURES; i++) lockout.recordFailure(EMAIL);
    advance(LOGIN_LOCK_WINDOW_MS - 1);
    expect(lockout.status(EMAIL)).toEqual({ locked: true, retryAfterMs: 1 });
    advance(1);
    expect(lockout.status(EMAIL).locked).toBe(false);
    // Penghitung mulai dari nol lagi.
    expect(lockout.recordFailure(EMAIL).locked).toBe(false);
  });

  it("kegagalan di luar window 15 menit tidak dihitung", () => {
    const { lockout, advance } = setup();
    for (let i = 0; i < LOGIN_MAX_FAILURES - 1; i++) {
      lockout.recordFailure(EMAIL);
    }
    advance(LOGIN_LOCK_WINDOW_MS);
    expect(lockout.recordFailure(EMAIL).locked).toBe(false);
  });

  it("login berhasil (reset) mengosongkan penghitung", () => {
    const { lockout } = setup();
    for (let i = 0; i < LOGIN_MAX_FAILURES - 1; i++) {
      lockout.recordFailure(EMAIL);
    }
    lockout.reset(EMAIL);
    expect(lockout.recordFailure(EMAIL).locked).toBe(false);
  });
});

describe("readSignInEmail", () => {
  it.each([
    [{ email: " Budi@Example.com " }, "budi@example.com"],
    [{ email: "" }, null],
    [{ email: 1 }, null],
    [{}, null],
    [null, null],
    ["budi@example.com", null],
  ])("%j → %j", (body, expected) => {
    expect(readSignInEmail(body)).toBe(expected);
  });
});
