import { describe, expect, it } from "vitest";

import {
  isPasswordValid,
  NAME_MAX_LENGTH,
  PASSWORD_RULES,
  REGISTER_MESSAGES,
  registerSchema,
} from "./schema";

const valid = {
  name: "Citra Lestari",
  email: "citra@example.com",
  password: "rahasia123",
  confirmPassword: "rahasia123",
};

function errorsOf(input: Record<string, unknown>) {
  const result = registerSchema.safeParse(input);
  if (result.success) return {};
  return Object.fromEntries(
    result.error.issues.map((issue) => [issue.path.join("."), issue.message]),
  );
}

describe("registerSchema", () => {
  it("menerima data valid, trim nama & lowercase email", () => {
    const result = registerSchema.parse({
      ...valid,
      name: "  Citra Lestari ",
      email: " Citra@Example.COM ",
    });
    expect(result).toEqual({ ...valid, email: "citra@example.com" });
  });

  it.each([
    [{ name: "" }, "name", REGISTER_MESSAGES.nameRequired],
    [{ name: "   " }, "name", REGISTER_MESSAGES.nameRequired],
    [
      { name: "a".repeat(NAME_MAX_LENGTH + 1) },
      "name",
      REGISTER_MESSAGES.nameTooLong,
    ],
    [{ email: "" }, "email", REGISTER_MESSAGES.emailRequired],
    [{ email: "budi@example" }, "email", REGISTER_MESSAGES.emailInvalid],
    [{ email: "budi.example.com" }, "email", REGISTER_MESSAGES.emailInvalid],
    [
      { password: "", confirmPassword: "" },
      "password",
      REGISTER_MESSAGES.passwordRequired,
    ],
    [
      { confirmPassword: "" },
      "confirmPassword",
      REGISTER_MESSAGES.confirmRequired,
    ],
    [
      { confirmPassword: "rahasia124" },
      "confirmPassword",
      REGISTER_MESSAGES.confirmMismatch,
    ],
  ])("menolak %j → %s: %s", (override, field, message) => {
    expect(errorsOf({ ...valid, ...override })[field]).toBe(message);
  });

  it("nama tepat 50 karakter masih valid", () => {
    const name = "a".repeat(NAME_MAX_LENGTH);
    expect(registerSchema.safeParse({ ...valid, name }).success).toBe(true);
  });

  it.each(["abc12", "abcdefgh", "12345678"])(
    "password %s belum memenuhi syarat",
    (password) => {
      expect(
        errorsOf({ ...valid, password, confirmPassword: password }).password,
      ).toBe(REGISTER_MESSAGES.passwordWeak);
    },
  );

  it("konfirmasi tidak sama tetap dilaporkan walau nama kosong", () => {
    const errors = errorsOf({
      ...valid,
      name: "",
      confirmPassword: "rahasia124",
    });
    expect(errors.name).toBe(REGISTER_MESSAGES.nameRequired);
    expect(errors.confirmPassword).toBe(REGISTER_MESSAGES.confirmMismatch);
  });
});

describe("PASSWORD_RULES / isPasswordValid", () => {
  const status = (password: string) =>
    Object.fromEntries(PASSWORD_RULES.map((r) => [r.key, r.test(password)]));

  it("mengevaluasi tiap syarat secara terpisah", () => {
    expect(status("")).toEqual({ length: false, mix: false });
    expect(status("abc12")).toEqual({ length: false, mix: true });
    expect(status("abcdefgh")).toEqual({ length: true, mix: false });
    expect(status("rahasia123")).toEqual({ length: true, mix: true });
  });

  it("menolak password lebih dari 128 karakter", () => {
    expect(isPasswordValid(`a1${"x".repeat(126)}`)).toBe(true);
    expect(isPasswordValid(`a1${"x".repeat(127)}`)).toBe(false);
  });
});
