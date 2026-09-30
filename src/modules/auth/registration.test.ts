import { verifyPassword } from "better-auth/crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  DEFAULT_EXPENSE_CATEGORIES,
  DEFAULT_INCOME_CATEGORIES,
} from "~/modules/categories/defaults";

import {
  createAccountWithDefaults,
  EmailTakenError,
  type RegistrationDb,
} from "./registration";

vi.mock("server-only", () => ({}));
vi.mock("~/lib/prisma", () => ({ prisma: {} }));

type CreateArgs = {
  data: {
    id: string;
    name: string;
    email: string;
    accounts: {
      create: { accountId: string; providerId: string; password: string };
    };
  };
};

function createFakeDb({ existing = false } = {}) {
  const tx = {
    user: {
      create: vi.fn(async ({ data }: CreateArgs) => ({
        id: data.id,
        name: data.name,
        email: data.email,
      })),
    },
    category: {
      count: vi.fn(async () => 0),
      createMany: vi.fn(async ({ data }: { data: unknown[] }) => ({
        count: data.length,
      })),
    },
  };
  const db = {
    user: {
      findUnique: vi.fn(async () => (existing ? { id: "u-lama" } : null)),
    },
    $transaction: vi.fn(async (fn: (client: typeof tx) => unknown) => fn(tx)),
  };
  return { db, tx, asDb: db as unknown as RegistrationDb };
}

const input = {
  name: "Citra Lestari",
  email: "Citra@Example.com",
  password: "rahasia123",
};

describe("createAccountWithDefaults", () => {
  beforeEach(() => vi.clearAllMocks());

  it("membuat user, akun credential & 11 kategori bawaan dalam satu transaksi", async () => {
    const { db, tx, asDb } = createFakeDb();

    const user = await createAccountWithDefaults(input, asDb);

    expect(user).toMatchObject({
      name: "Citra Lestari",
      email: "citra@example.com",
    });
    expect(db.$transaction).toHaveBeenCalledTimes(1);

    const { data } = tx.user.create.mock.calls[0][0];
    expect(data.email).toBe("citra@example.com");
    expect(data.id).toHaveLength(32);
    expect(data.accounts.create).toMatchObject({
      accountId: data.id,
      providerId: "credential",
    });
    // Password disimpan dalam bentuk hash, bukan teks biasa.
    expect(data.accounts.create.password).not.toContain("rahasia123");
    await expect(
      verifyPassword({
        hash: data.accounts.create.password,
        password: "rahasia123",
      }),
    ).resolves.toBe(true);

    const created = tx.category.createMany.mock.calls[0][0].data as Array<{
      userId: string;
      isDefault: boolean;
    }>;
    expect(created).toHaveLength(
      DEFAULT_EXPENSE_CATEGORIES.length + DEFAULT_INCOME_CATEGORIES.length,
    );
    expect(created.every((c) => c.userId === data.id && c.isDefault)).toBe(
      true,
    );
  });

  it("melempar EmailTakenError bila email (case-insensitive) sudah ada", async () => {
    const { db, asDb } = createFakeDb({ existing: true });

    await expect(createAccountWithDefaults(input, asDb)).rejects.toBeInstanceOf(
      EmailTakenError,
    );
    expect(db.user.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { email: "citra@example.com" } }),
    );
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it("mengubah unique violation (double submit / race) jadi EmailTakenError", async () => {
    const { db, asDb } = createFakeDb();
    db.$transaction.mockRejectedValueOnce(
      Object.assign(new Error("Unique constraint failed"), { code: "P2002" }),
    );

    await expect(createAccountWithDefaults(input, asDb)).rejects.toBeInstanceOf(
      EmailTakenError,
    );
  });

  it("meneruskan error lain (transaksi di-rollback oleh Prisma)", async () => {
    const { db, asDb } = createFakeDb();
    db.$transaction.mockRejectedValueOnce(new Error("koneksi putus"));

    await expect(createAccountWithDefaults(input, asDb)).rejects.toThrow(
      "koneksi putus",
    );
  });
});
