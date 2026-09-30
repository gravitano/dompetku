import { describe, expect, it } from "vitest";

import { createRateLimiter, getClientIp } from "./rate-limit";

describe("createRateLimiter", () => {
  it("mengizinkan sampai batas lalu menolak dalam window yang sama", () => {
    let time = 0;
    const limiter = createRateLimiter({
      max: 2,
      windowMs: 1000,
      now: () => time,
    });

    expect(limiter.hit("a").allowed).toBe(true);
    expect(limiter.hit("a").allowed).toBe(true);
    const third = limiter.hit("a");
    expect(third.allowed).toBe(false);
    expect(third.remaining).toBe(0);
    expect(third.retryAfterMs).toBe(1000);

    // key lain punya kuota sendiri
    expect(limiter.hit("b").allowed).toBe(true);

    time = 1000;
    expect(limiter.hit("a").allowed).toBe(true);
  });

  it("reset() mengosongkan semua bucket", () => {
    const limiter = createRateLimiter({ max: 1, windowMs: 1000 });
    limiter.hit("a");
    expect(limiter.hit("a").allowed).toBe(false);
    limiter.reset();
    expect(limiter.hit("a").allowed).toBe(true);
  });
});

describe("getClientIp", () => {
  it("memakai IP pertama dari X-Forwarded-For", () => {
    const headers = new Headers({ "x-forwarded-for": "1.2.3.4, 10.0.0.1" });
    expect(getClientIp(headers)).toBe("1.2.3.4");
  });

  it("fallback ke X-Real-IP lalu 'unknown'", () => {
    expect(getClientIp(new Headers({ "x-real-ip": "5.6.7.8" }))).toBe(
      "5.6.7.8",
    );
    expect(getClientIp(new Headers())).toBe("unknown");
  });
});
