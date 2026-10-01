import { APIError } from "better-auth/api";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { LOGIN_LOCKED_ERROR_CODE } from "./login-lockout";
import { LOGIN_MESSAGES, REGISTER_MESSAGES } from "./schema";

const mocks = vi.hoisted(() => ({
  headers: new Headers(),
  createAccountWithDefaults: vi.fn(),
  signInEmail: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("~/lib/prisma", () => ({ prisma: {} }));
vi.mock("next/headers", () => ({ headers: async () => mocks.headers }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  },
}));
vi.mock("~/lib/auth", () => ({
  auth: { api: { signInEmail: mocks.signInEmail, signOut: mocks.signOut } },
}));
vi.mock("./registration", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./registration")>()),
  createAccountWithDefaults: mocks.createAccountWithDefaults,
}));

const { loginAction, logoutAction, registerAction } = await import("./actions");
const { EmailTakenError } = await import("./registration");

const valid = {
  name: " Citra Lestari ",
  email: "Citra@Example.com",
  password: "rahasia123",
  confirmPassword: "rahasia123",
};

describe("registerAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.headers = new Headers();
    mocks.createAccountWithDefaults.mockResolvedValue({ id: "u1" });
    mocks.signInEmail.mockResolvedValue({});
  });

  afterEach(() => vi.unstubAllEnvs());

  it("membuat akun, auto-login, lalu redirect ke Beranda dengan sapaan", async () => {
    await expect(registerAction(valid)).rejects.toThrow(
      "NEXT_REDIRECT:/?welcome=1",
    );
    expect(mocks.createAccountWithDefaults).toHaveBeenCalledWith({
      name: "Citra Lestari",
      email: "citra@example.com",
      password: "rahasia123",
    });
    expect(mocks.signInEmail).toHaveBeenCalledWith({
      body: { email: "citra@example.com", password: "rahasia123" },
      headers: mocks.headers,
    });
  });

  it("mengembalikan VALIDATION_ERROR per field tanpa membuat akun", async () => {
    const result = await registerAction({ ...valid, password: "abcdefgh" });

    expect(result).toMatchObject({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        details: expect.arrayContaining([
          { field: "password", message: REGISTER_MESSAGES.passwordWeak },
        ]),
      },
    });
    expect(mocks.createAccountWithDefaults).not.toHaveBeenCalled();
  });

  it("menolak input bukan objek", async () => {
    const result = await registerAction(null);
    expect(result.success).toBe(false);
  });

  it("mengembalikan CONFLICT pada field email bila email sudah terdaftar", async () => {
    mocks.createAccountWithDefaults.mockRejectedValue(new EmailTakenError());

    const result = await registerAction(valid);

    expect(result).toEqual({
      success: false,
      error: {
        code: "CONFLICT",
        message: REGISTER_MESSAGES.emailTaken,
        details: [{ field: "email", message: REGISTER_MESSAGES.emailTaken }],
      },
    });
    expect(mocks.signInEmail).not.toHaveBeenCalled();
  });

  it("mengembalikan INTERNAL_ERROR generik bila terjadi kesalahan sistem", async () => {
    mocks.createAccountWithDefaults.mockRejectedValue(new Error("db down"));

    const result = await registerAction(valid);

    expect(result).toEqual({
      success: false,
      error: { code: "INTERNAL_ERROR", message: REGISTER_MESSAGES.systemError },
    });
  });

  it("redirect ke /login bila akun dibuat tetapi auto-login gagal", async () => {
    mocks.signInEmail.mockRejectedValue(new Error("sign-in gagal"));

    await expect(registerAction(valid)).rejects.toThrow(
      "NEXT_REDIRECT:/login?registered=1",
    );
  });

  it("membatasi 5 percobaan per menit per IP di production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    mocks.headers = new Headers({ "x-forwarded-for": "203.0.113.7" });

    for (let i = 0; i < 5; i++) {
      await expect(registerAction(valid)).rejects.toThrow("NEXT_REDIRECT");
    }
    const result = await registerAction(valid);

    expect(result).toEqual({
      success: false,
      error: { code: "RATE_LIMITED", message: REGISTER_MESSAGES.rateLimited },
    });
    expect(mocks.createAccountWithDefaults).toHaveBeenCalledTimes(5);
  });

  it("tidak membatasi di luar production", async () => {
    mocks.headers = new Headers({ "x-forwarded-for": "203.0.113.8" });
    for (let i = 0; i < 7; i++) {
      await expect(registerAction(valid)).rejects.toThrow("NEXT_REDIRECT");
    }
  });
});

describe("loginAction", () => {
  const credentials = { email: " Budi@Example.COM ", password: "Password123" };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.headers = new Headers();
    mocks.signInEmail.mockResolvedValue({});
  });

  afterEach(() => vi.unstubAllEnvs());

  it("login dengan email lowercase lalu redirect ke Beranda", async () => {
    await expect(loginAction(credentials)).rejects.toThrow("NEXT_REDIRECT:/");
    expect(mocks.signInEmail).toHaveBeenCalledWith({
      body: { email: "budi@example.com", password: "Password123" },
      headers: mocks.headers,
    });
  });

  it("redirect ke callbackUrl internal", async () => {
    await expect(
      loginAction({ ...credentials, callbackUrl: "/budgets?month=2026-09" }),
    ).rejects.toThrow("NEXT_REDIRECT:/budgets?month=2026-09");
  });

  it.each(["https://evil.example.com", "//evil.example.com", "/login", 42])(
    "callbackUrl tidak aman %j → Beranda",
    async (callbackUrl) => {
      await expect(
        loginAction({ ...credentials, callbackUrl }),
      ).rejects.toThrow(/^NEXT_REDIRECT:\/$/);
    },
  );

  it("VALIDATION_ERROR per field tanpa memanggil better-auth", async () => {
    const result = await loginAction({ email: "", password: "" });
    expect(result).toMatchObject({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        details: [
          { field: "email", message: LOGIN_MESSAGES.emailRequired },
          { field: "password", message: LOGIN_MESSAGES.passwordRequired },
        ],
      },
    });
    expect(mocks.signInEmail).not.toHaveBeenCalled();
  });

  it("kredensial salah → pesan umum", async () => {
    mocks.signInEmail.mockRejectedValue(
      new APIError("UNAUTHORIZED", {
        code: "INVALID_EMAIL_OR_PASSWORD",
        message: "Invalid email or password",
      }),
    );
    expect(await loginAction(credentials)).toEqual({
      success: false,
      error: {
        code: "UNAUTHORIZED",
        message: LOGIN_MESSAGES.invalidCredentials,
      },
    });
  });

  it("email terkunci → RATE_LIMITED dengan pesan 15 menit", async () => {
    mocks.signInEmail.mockRejectedValue(
      new APIError("TOO_MANY_REQUESTS", {
        code: LOGIN_LOCKED_ERROR_CODE,
        message: LOGIN_MESSAGES.locked,
      }),
    );
    expect(await loginAction(credentials)).toEqual({
      success: false,
      error: { code: "RATE_LIMITED", message: LOGIN_MESSAGES.locked },
    });
  });

  it("kesalahan sistem → INTERNAL_ERROR generik", async () => {
    mocks.signInEmail.mockRejectedValue(new Error("db down"));
    expect(await loginAction(credentials)).toEqual({
      success: false,
      error: { code: "INTERNAL_ERROR", message: LOGIN_MESSAGES.systemError },
    });
  });

  it("membatasi 10 percobaan per menit per IP di production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    mocks.headers = new Headers({ "x-forwarded-for": "203.0.113.20" });
    for (let i = 0; i < 10; i++) {
      await expect(loginAction(credentials)).rejects.toThrow("NEXT_REDIRECT");
    }
    expect(await loginAction(credentials)).toEqual({
      success: false,
      error: { code: "RATE_LIMITED", message: LOGIN_MESSAGES.rateLimited },
    });
    expect(mocks.signInEmail).toHaveBeenCalledTimes(10);
  });
});

describe("logoutAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.headers = new Headers({ cookie: "better-auth.session_token=abc" });
  });

  it("mencabut session lewat better-auth", async () => {
    mocks.signOut.mockResolvedValue({ success: true });
    expect(await logoutAction()).toEqual({ success: true, data: undefined });
    expect(mocks.signOut).toHaveBeenCalledWith({ headers: mocks.headers });
  });

  it("gagal → INTERNAL_ERROR dengan pesan Indonesia", async () => {
    mocks.signOut.mockRejectedValue(new Error("db down"));
    expect(await logoutAction()).toEqual({
      success: false,
      error: { code: "INTERNAL_ERROR", message: LOGIN_MESSAGES.logoutFailed },
    });
  });
});
