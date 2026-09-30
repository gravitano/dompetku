import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { REGISTER_MESSAGES } from "./schema";

const mocks = vi.hoisted(() => ({
  headers: new Headers(),
  createAccountWithDefaults: vi.fn(),
  signInEmail: vi.fn(),
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
  auth: { api: { signInEmail: mocks.signInEmail } },
}));
vi.mock("./registration", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./registration")>()),
  createAccountWithDefaults: mocks.createAccountWithDefaults,
}));

const { registerAction } = await import("./actions");
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
      error: { code: "INTERNAL_ERROR", message: REGISTER_MESSAGES.rateLimited },
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
