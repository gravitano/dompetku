import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { BUDGET_MESSAGES as M } from "./schema";

/**
 * Database kategori & anggaran in-memory (subset API Prisma yang dipakai
 * actions) agar aturan bisnis diuji terhadap data nyata: kepemilikan, unik per
 * kategori-bulan, bulan lampau/depan, salin, kategori terarsip.
 */
type Category = {
  id: string;
  userId: string;
  name: string;
  type: "EXPENSE" | "INCOME";
  archivedAt: Date | null;
};

type Budget = {
  id: string;
  userId: string;
  categoryId: string;
  periodMonth: Date;
  amount: bigint;
};

type Where = Record<string, unknown>;

function same(actual: unknown, expected: unknown): boolean {
  if (actual instanceof Date && expected instanceof Date) {
    return actual.getTime() === expected.getTime();
  }
  return actual === expected;
}

function matches(row: Record<string, unknown>, where: Where = {}): boolean {
  return Object.entries(where).every(([key, expected]) => {
    if (key === "category") {
      const category = store.categories.find((c) => c.id === row.categoryId);
      return !!category && matches(category, expected as Where);
    }
    return same(row[key], expected);
  });
}

const store = vi.hoisted(() => ({
  categories: [] as Category[],
  budgets: [] as Budget[],
  fail: false,
  seq: 0,
}));

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  revalidatePath: vi.fn(),
  lock: vi.fn(),
}));

function nextId(prefix: string) {
  return `00000000-0000-4000-${prefix}-${String(++store.seq).padStart(12, "0")}`;
}

const tx = {
  $executeRaw: (...args: unknown[]) => {
    mocks.lock(...args);
    return Promise.resolve(1);
  },
  category: {
    findFirst: async ({ where }: { where: Where }) => {
      const row = store.categories.find((c) => matches(c, where));
      return row ? { id: row.id } : null;
    },
  },
  budget: {
    count: async ({ where }: { where: Where }) =>
      store.budgets.filter((b) => matches(b, where)).length,
    findMany: async ({ where }: { where: Where }) =>
      store.budgets
        .filter((b) => matches(b, where))
        .map((b) => ({ categoryId: b.categoryId, amount: b.amount })),
    upsert: async ({
      where,
      create,
      update,
    }: {
      where: {
        userId_categoryId_periodMonth: Omit<Budget, "id" | "amount">;
      };
      create: Omit<Budget, "id">;
      update: { amount: bigint };
    }) => {
      if (store.fail) throw new Error("db down");
      const existing = store.budgets.find((b) =>
        matches(b, where.userId_categoryId_periodMonth),
      );
      if (existing) {
        Object.assign(existing, update);
        return { id: existing.id };
      }
      const row = { id: nextId("9000"), ...create };
      store.budgets.push(row);
      return { id: row.id };
    },
    deleteMany: async ({ where }: { where: Where }) => {
      if (store.fail) throw new Error("db down");
      const before = store.budgets.length;
      store.budgets = store.budgets.filter((b) => !matches(b, where));
      return { count: before - store.budgets.length };
    },
    createMany: async ({
      data,
      skipDuplicates,
    }: {
      data: Omit<Budget, "id">[];
      skipDuplicates?: boolean;
    }) => {
      if (store.fail) throw new Error("db down");
      let count = 0;
      for (const row of data) {
        const duplicate = store.budgets.some((b) =>
          matches(b, {
            userId: row.userId,
            categoryId: row.categoryId,
            periodMonth: row.periodMonth,
          }),
        );
        if (duplicate && skipDuplicates) continue;
        if (duplicate) throw new Error("unique violation");
        store.budgets.push({ id: nextId("9000"), ...row });
        count++;
      }
      return { count };
    },
  },
};

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("~/lib/prisma", () => ({
  prisma: {
    $transaction: async (fn: (client: typeof tx) => unknown) => fn(tx),
  },
}));
vi.mock("~/lib/session", async () => {
  class UnauthorizedError extends Error {
    readonly code = "UNAUTHORIZED" as const;
    constructor(message = "Sesi berakhir. Silakan masuk kembali.") {
      super(message);
    }
  }
  return { requireUser: mocks.requireUser, UnauthorizedError };
});

const { copyPreviousBudgetsAction, deleteBudgetAction, setBudgetAction } =
  await import("./actions");
const { UnauthorizedError } = await import("~/lib/session");

const BUDI = "user-budi";
const ANI = "user-ani";
/** 15 Okt 2026 10:00 WIB → bulan berjalan 2026-10. */
const NOW = new Date("2026-10-15T03:00:00Z");
const OKT = "2026-10";
const NOV = "2026-11";
const SEP = "2026-09";

const month = (key: string) => new Date(`${key}-01T00:00:00Z`);

function addCategory(
  userId: string,
  name: string,
  extra: Partial<Category> = {},
): Category {
  const row: Category = {
    id: nextId("8000"),
    userId,
    name,
    type: "EXPENSE",
    archivedAt: null,
    ...extra,
  };
  store.categories.push(row);
  return row;
}

function addBudget(category: Category, key: string, amount: number): Budget {
  const row: Budget = {
    id: nextId("9000"),
    userId: category.userId,
    categoryId: category.id,
    periodMonth: month(key),
    amount: BigInt(amount),
  };
  store.budgets.push(row);
  return row;
}

function budgetsOf(userId: string, key: string) {
  return store.budgets
    .filter((b) => b.userId === userId && same(b.periodMonth, month(key)))
    .map((b) => [
      store.categories.find((c) => c.id === b.categoryId)?.name,
      Number(b.amount),
    ])
    .sort();
}

let makan: Category;
let transport: Category;
let tagihan: Category;
let hobi: Category;
let gaji: Category;
let aniMakan: Category;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  store.categories = [];
  store.budgets = [];
  store.fail = false;
  mocks.requireUser.mockResolvedValue({ id: BUDI, name: "Budi" });

  makan = addCategory(BUDI, "Makan & Minum");
  transport = addCategory(BUDI, "Transportasi");
  tagihan = addCategory(BUDI, "Tagihan");
  hobi = addCategory(BUDI, "Hobi", { archivedAt: new Date() });
  gaji = addCategory(BUDI, "Gaji", { type: "INCOME" });
  aniMakan = addCategory(ANI, "Makan & Minum");
});

afterEach(() => {
  vi.useRealTimers();
});

const expectNoRevalidate = () =>
  expect(mocks.revalidatePath).not.toHaveBeenCalled();

describe("setBudgetAction", () => {
  it("mengatur anggaran baru milik user session lalu revalidate (AC 4)", async () => {
    const result = await setBudgetAction({
      categoryId: makan.id,
      month: OKT,
      amount: "1500000",
      userId: ANI, // diabaikan: userId selalu dari session
    });

    expect(result).toEqual({
      success: true,
      data: { categoryId: makan.id, month: OKT },
    });
    expect(store.budgets).toHaveLength(1);
    expect(store.budgets[0]).toMatchObject({
      userId: BUDI,
      categoryId: makan.id,
      periodMonth: month(OKT),
      amount: BigInt(1_500_000),
    });
    expect(mocks.lock).toHaveBeenCalledOnce();
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  it("mengatur ulang = mengubah anggaran yang ada, tetap satu per kategori-bulan (AC 5, 7)", async () => {
    addBudget(transport, OKT, 600_000);
    const result = await setBudgetAction({
      categoryId: transport.id,
      month: OKT,
      amount: "750000",
    });
    expect(result.success).toBe(true);
    expect(budgetsOf(BUDI, OKT)).toEqual([["Transportasi", 750_000]]);
  });

  it("bulan depan (+1) boleh, bulan yang sama di kategori lain terpisah", async () => {
    expect(
      (
        await setBudgetAction({
          categoryId: makan.id,
          month: NOV,
          amount: "1000",
        })
      ).success,
    ).toBe(true);
    expect(budgetsOf(BUDI, NOV)).toEqual([["Makan & Minum", 1000]]);
  });

  it.each([
    [SEP, M.monthPast],
    ["2025-12", M.monthPast],
    ["2026-12", M.monthTooFar],
  ])("bulan %s → CONFLICT %s (AC 2, AC 10)", async (key, message) => {
    const result = await setBudgetAction({
      categoryId: makan.id,
      month: key,
      amount: "1000",
    });
    expect(result).toEqual({
      success: false,
      error: { code: "CONFLICT", message },
    });
    expect(store.budgets).toHaveLength(0);
    expect(mocks.lock).not.toHaveBeenCalled();
    expectNoRevalidate();
  });

  it("bulan dihitung dari jam server Asia/Jakarta (31 Okt 17:30 UTC = 1 Nov WIB)", async () => {
    vi.setSystemTime(new Date("2026-10-31T17:30:00Z"));
    const result = await setBudgetAction({
      categoryId: makan.id,
      month: OKT,
      amount: "1000",
    });
    expect(result.success || result.error.message).toBe(M.monthPast);
    expect(
      (
        await setBudgetAction({
          categoryId: makan.id,
          month: "2026-12",
          amount: "1000",
        })
      ).success,
    ).toBe(true);
  });

  it.each([
    ["", M.amountRequired],
    ["0", M.amountMin],
    ["1000000001", M.amountMax],
  ])(
    "nominal %j → VALIDATION_ERROR di field amount",
    async (amount, message) => {
      const result = await setBudgetAction({
        categoryId: makan.id,
        month: OKT,
        amount,
      });
      expect(result).toEqual({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message,
          details: [{ field: "amount", message }],
        },
      });
      expect(store.budgets).toHaveLength(0);
    },
  );

  it.each([
    ["milik user lain", () => aniMakan.id],
    ["terarsip", () => hobi.id],
    ["pemasukan", () => gaji.id],
    ["tidak ada", () => "00000000-0000-4000-8000-999999999999"],
  ])("kategori %s → Kategori tidak ditemukan (AC 12)", async (_, id) => {
    const result = await setBudgetAction({
      categoryId: id(),
      month: OKT,
      amount: "1000",
    });
    expect(result).toEqual({
      success: false,
      error: { code: "NOT_FOUND", message: M.categoryNotFound },
    });
    expect(store.budgets).toHaveLength(0);
    expectNoRevalidate();
  });

  it("belum login → UNAUTHORIZED; DB gagal → pesan sistem", async () => {
    mocks.requireUser.mockRejectedValueOnce(new UnauthorizedError());
    const unauthorized = await setBudgetAction({
      categoryId: makan.id,
      month: OKT,
      amount: "1000",
    });
    expect(unauthorized.success || unauthorized.error.code).toBe(
      "UNAUTHORIZED",
    );

    store.fail = true;
    const failed = await setBudgetAction({
      categoryId: makan.id,
      month: OKT,
      amount: "1000",
    });
    expect(failed).toEqual({
      success: false,
      error: { code: "INTERNAL_ERROR", message: M.systemError },
    });
    expectNoRevalidate();
  });
});

describe("deleteBudgetAction", () => {
  it("menghapus anggaran kategori-bulan tsb saja (AC 6)", async () => {
    addBudget(makan, OKT, 1_000_000);
    addBudget(makan, NOV, 900_000);
    addBudget(aniMakan, OKT, 500_000);

    const result = await deleteBudgetAction({
      categoryId: makan.id,
      month: OKT,
    });
    expect(result.success).toBe(true);
    expect(budgetsOf(BUDI, OKT)).toEqual([]);
    expect(budgetsOf(BUDI, NOV)).toEqual([["Makan & Minum", 900_000]]);
    expect(budgetsOf(ANI, OKT)).toEqual([["Makan & Minum", 500_000]]);
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  it("anggaran yang sudah tidak ada → tetap berhasil (idempoten)", async () => {
    const result = await deleteBudgetAction({
      categoryId: makan.id,
      month: OKT,
    });
    expect(result.success).toBe(true);
  });

  it("bulan lampau read-only → CONFLICT, anggaran tetap", async () => {
    addBudget(makan, SEP, 1_200_000);
    const result = await deleteBudgetAction({
      categoryId: makan.id,
      month: SEP,
    });
    expect(result).toEqual({
      success: false,
      error: { code: "CONFLICT", message: M.monthPast },
    });
    expect(budgetsOf(BUDI, SEP)).toEqual([["Makan & Minum", 1_200_000]]);
  });

  it("kategori user lain / terarsip / id tidak valid → Anggaran tidak ditemukan", async () => {
    addBudget(aniMakan, OKT, 500_000);
    addBudget(hobi, OKT, 200_000);
    for (const input of [
      { categoryId: aniMakan.id, month: OKT },
      { categoryId: hobi.id, month: OKT },
      { categoryId: "cat-ani", month: OKT },
      { categoryId: makan.id },
    ]) {
      const result = await deleteBudgetAction(input);
      expect(result).toEqual({
        success: false,
        error: { code: "NOT_FOUND", message: M.notFound },
      });
    }
    expect(budgetsOf(ANI, OKT)).toHaveLength(1);
    expect(budgetsOf(BUDI, OKT)).toEqual([["Hobi", 200_000]]);
    expectNoRevalidate();
  });
});

describe("copyPreviousBudgetsAction", () => {
  it("menyalin semua anggaran bulan lalu untuk kategori aktif (AC 9)", async () => {
    addBudget(makan, OKT, 1_500_000);
    addBudget(tagihan, OKT, 1_400_000);
    addBudget(hobi, OKT, 300_000); // terarsip → dilewati
    addBudget(aniMakan, OKT, 999); // milik user lain

    const result = await copyPreviousBudgetsAction({ month: NOV });

    expect(result).toEqual({
      success: true,
      data: { copied: 2, fromMonth: OKT },
    });
    expect(budgetsOf(BUDI, NOV)).toEqual([
      ["Makan & Minum", 1_500_000],
      ["Tagihan", 1_400_000],
    ]);
    expect(budgetsOf(ANI, NOV)).toEqual([]);
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  it("menyalin September ke bulan berjalan (Oktober)", async () => {
    addBudget(makan, SEP, 1_200_000);
    const result = await copyPreviousBudgetsAction({ month: OKT });
    expect(result.success).toBe(true);
    expect(budgetsOf(BUDI, OKT)).toEqual([["Makan & Minum", 1_200_000]]);
  });

  it("bulan tujuan sudah punya anggaran → CONFLICT, tidak ada yang berubah", async () => {
    addBudget(makan, OKT, 1_500_000);
    addBudget(transport, NOV, 100_000);
    const result = await copyPreviousBudgetsAction({ month: NOV });
    expect(result).toEqual({
      success: false,
      error: { code: "CONFLICT", message: M.alreadyHasBudgets },
    });
    expect(budgetsOf(BUDI, NOV)).toEqual([["Transportasi", 100_000]]);
    expectNoRevalidate();
  });

  it("bulan lalu kosong / hanya kategori terarsip → Bulan lalu belum punya anggaran", async () => {
    expect(await copyPreviousBudgetsAction({ month: NOV })).toEqual({
      success: false,
      error: { code: "NOT_FOUND", message: M.nothingToCopy },
    });
    addBudget(hobi, OKT, 300_000);
    expect(await copyPreviousBudgetsAction({ month: NOV })).toEqual({
      success: false,
      error: { code: "NOT_FOUND", message: M.nothingToCopy },
    });
    expect(budgetsOf(BUDI, NOV)).toEqual([]);
  });

  it("bulan lampau / > +1 bulan → CONFLICT", async () => {
    addBudget(makan, "2026-08", 1);
    expect(await copyPreviousBudgetsAction({ month: SEP })).toEqual({
      success: false,
      error: { code: "CONFLICT", message: M.monthPast },
    });
    expect(await copyPreviousBudgetsAction({ month: "2026-12" })).toEqual({
      success: false,
      error: { code: "CONFLICT", message: M.monthTooFar },
    });
    expect(budgetsOf(BUDI, SEP)).toEqual([]);
  });

  it("input tidak valid → VALIDATION_ERROR; DB gagal → pesan sistem", async () => {
    const invalid = await copyPreviousBudgetsAction({ month: "Nov" });
    expect(invalid.success || invalid.error.code).toBe("VALIDATION_ERROR");

    addBudget(makan, OKT, 1);
    store.fail = true;
    expect(await copyPreviousBudgetsAction({ month: NOV })).toEqual({
      success: false,
      error: { code: "INTERNAL_ERROR", message: M.copyError },
    });
  });
});
