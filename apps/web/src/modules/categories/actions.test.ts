import { beforeEach, describe, expect, it, vi } from "vitest";

import { CATEGORY_ACTIVE_MAX, CATEGORY_MESSAGES as M } from "./schema";

/**
 * Database kategori in-memory (subset API Prisma yang dipakai actions) agar
 * aturan bisnis diuji terhadap data nyata: kepemilikan, nama unik, minimal 1
 * aktif, hapus vs arsip, pulihkan.
 */
type Row = {
  id: string;
  userId: string;
  name: string;
  type: "EXPENSE" | "INCOME";
  icon: string | null;
  isDefault: boolean;
  archivedAt: Date | null;
};

type Where = Record<string, unknown>;

function matches(row: Record<string, unknown>, where: Where = {}): boolean {
  return Object.entries(where).every(([key, expected]) => {
    const actual = row[key];
    if (expected && typeof expected === "object" && "not" in expected) {
      return actual !== (expected as { not: unknown }).not;
    }
    return actual === expected;
  });
}

const store = vi.hoisted(() => ({
  categories: [] as Row[],
  transactions: [] as Array<{ id: string; userId: string; categoryId: string }>,
  fail: false,
  seq: 0,
}));

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  revalidatePath: vi.fn(),
  lock: vi.fn(),
}));

function pick<T extends Record<string, unknown>>(
  row: T,
  select?: Record<string, boolean>,
) {
  if (!select) return { ...row };
  return Object.fromEntries(Object.keys(select).map((k) => [k, row[k]]));
}

const tx = {
  $executeRaw: (...args: unknown[]) => {
    mocks.lock(...args);
    return Promise.resolve(1);
  },
  category: {
    findMany: async ({
      where,
      select,
    }: {
      where: Where;
      select?: Record<string, boolean>;
    }) =>
      store.categories
        .filter((c) => matches(c, where))
        .map((c) => pick(c, select)),
    findFirst: async ({
      where,
      select,
    }: {
      where: Where;
      select?: Record<string, boolean>;
    }) => {
      const row = store.categories.find((c) => matches(c, where));
      return row ? pick(row, select) : null;
    },
    count: async ({ where }: { where: Where }) =>
      store.categories.filter((c) => matches(c, where)).length,
    create: async ({ data }: { data: Omit<Row, "id" | "archivedAt"> }) => {
      if (store.fail) throw new Error("db down");
      const row: Row = {
        id: `00000000-0000-4000-8000-${String(++store.seq).padStart(12, "0")}`,
        archivedAt: null,
        ...data,
      };
      store.categories.push(row);
      return { id: row.id };
    },
    updateMany: async ({
      where,
      data,
    }: {
      where: Where;
      data: Partial<Row>;
    }) => {
      const rows = store.categories.filter((c) => matches(c, where));
      rows.forEach((row) => Object.assign(row, data));
      return { count: rows.length };
    },
    deleteMany: async ({ where }: { where: Where }) => {
      const before = store.categories.length;
      store.categories = store.categories.filter((c) => !matches(c, where));
      return { count: before - store.categories.length };
    },
  },
  transaction: {
    count: async ({ where }: { where: Where }) =>
      store.transactions.filter((t) => matches(t, where)).length,
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

const {
  archiveCategoryAction,
  createCategoryAction,
  deleteCategoryAction,
  restoreCategoryAction,
  updateCategoryAction,
} = await import("./actions");
const { UnauthorizedError } = await import("~/lib/session");

const BUDI = "user-budi";
const ANI = "user-ani";

function add(userId: string, name: string, extra: Partial<Row> = {}): Row {
  const row: Row = {
    id: `00000000-0000-4000-9000-${String(++store.seq).padStart(12, "0")}`,
    userId,
    name,
    type: "EXPENSE",
    icon: "package",
    isDefault: true,
    archivedAt: null,
    ...extra,
  };
  store.categories.push(row);
  return row;
}

let makan: Row;
let belanja: Row;
let gaji: Row;
let aniKopi: Row;

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  store.categories = [];
  store.transactions = [];
  store.fail = false;
  mocks.requireUser.mockResolvedValue({ id: BUDI, name: "Budi" });

  makan = add(BUDI, "Makan & Minum", { icon: "utensils" });
  belanja = add(BUDI, "Belanja");
  add(BUDI, "Game", { archivedAt: new Date(), isDefault: false });
  gaji = add(BUDI, "Gaji", { type: "INCOME", icon: "wallet" });
  aniKopi = add(ANI, "Kopi", { isDefault: false });
  store.transactions.push({ id: "t1", userId: BUDI, categoryId: makan.id });
});

const expectNoRevalidate = () =>
  expect(mocks.revalidatePath).not.toHaveBeenCalled();

describe("createCategoryAction", () => {
  it("menambah kategori milik user session (nama di-trim) lalu revalidate", async () => {
    const result = await createCategoryAction({
      type: "EXPENSE",
      name: "  Kopi ",
      icon: "coffee",
      userId: ANI, // diabaikan: userId selalu dari session
    });

    expect(result.success).toBe(true);
    const created = store.categories.at(-1)!;
    expect(created).toMatchObject({
      userId: BUDI,
      name: "Kopi",
      type: "EXPENSE",
      icon: "coffee",
      isDefault: false,
      archivedAt: null,
    });
    expect(mocks.lock).toHaveBeenCalledOnce();
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  it.each([
    ["makan & minum", "aktif"],
    [" GAME ", "terarsip"],
  ])(
    "nama %j sudah dipakai kategori %s → Nama kategori sudah ada",
    async (name) => {
      const result = await createCategoryAction({
        type: "EXPENSE",
        name,
        icon: "coffee",
      });
      expect(result).toEqual({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: M.nameTaken,
          details: [{ field: "name", message: M.nameTaken }],
        },
      });
      expectNoRevalidate();
    },
  );

  it("nama sama boleh di jenis berbeda & tidak bentrok dengan kategori user lain", async () => {
    expect(
      (
        await createCategoryAction({
          type: "INCOME",
          name: "Makan & Minum",
          icon: "utensils",
        })
      ).success,
    ).toBe(true);
    expect(
      (
        await createCategoryAction({
          type: "EXPENSE",
          name: "Kopi",
          icon: "coffee",
        })
      ).success,
    ).toBe(true);
  });

  it("validasi field (nama kosong, > 30, ikon) tanpa menyentuh DB", async () => {
    const before = store.categories.length;
    for (const input of [
      { type: "EXPENSE", name: "", icon: "coffee" },
      { type: "EXPENSE", name: "x".repeat(31), icon: "coffee" },
      { type: "EXPENSE", name: "Kopi", icon: "☕" },
    ]) {
      const result = await createCategoryAction(input);
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error.code).toBe("VALIDATION_ERROR");
    }
    expect(store.categories).toHaveLength(before);
    expect(mocks.lock).not.toHaveBeenCalled();
  });

  it(`maksimal ${CATEGORY_ACTIVE_MAX} kategori aktif per jenis`, async () => {
    for (
      let i = store.categories.filter(
        (c) => c.userId === BUDI && c.type === "EXPENSE" && !c.archivedAt,
      ).length;
      i < CATEGORY_ACTIVE_MAX;
      i++
    ) {
      add(BUDI, `Kategori ${i}`);
    }
    const result = await createCategoryAction({
      type: "EXPENSE",
      name: "Kopi",
      icon: "coffee",
    });
    expect(result).toEqual({
      success: false,
      error: { code: "CONFLICT", message: M.limitReached },
    });
  });

  it("belum login → UNAUTHORIZED; DB gagal → pesan sistem", async () => {
    mocks.requireUser.mockRejectedValueOnce(new UnauthorizedError());
    const unauthorized = await createCategoryAction({
      type: "EXPENSE",
      name: "Kopi",
      icon: "coffee",
    });
    expect(unauthorized.success || unauthorized.error.code).toBe(
      "UNAUTHORIZED",
    );

    store.fail = true;
    const failed = await createCategoryAction({
      type: "EXPENSE",
      name: "Kopi",
      icon: "coffee",
    });
    expect(failed).toEqual({
      success: false,
      error: { code: "INTERNAL_ERROR", message: M.systemError },
    });
    expectNoRevalidate();
  });
});

describe("updateCategoryAction", () => {
  it("mengubah nama & ikon (termasuk kategori bawaan yang sudah dipakai)", async () => {
    const result = await updateCategoryAction({
      id: makan.id,
      name: "Makan",
      icon: "coffee",
    });
    expect(result).toEqual({ success: true, data: { id: makan.id } });
    expect(makan).toMatchObject({
      name: "Makan",
      icon: "coffee",
      type: "EXPENSE",
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  it("boleh mempertahankan namanya sendiri / hanya beda huruf besar-kecil", async () => {
    expect(
      (
        await updateCategoryAction({
          id: makan.id,
          name: "MAKAN & MINUM",
          icon: "utensils",
        })
      ).success,
    ).toBe(true);
    expect(makan.name).toBe("MAKAN & MINUM");
  });

  it("nama kategori lain di jenis sama → Nama kategori sudah ada", async () => {
    const result = await updateCategoryAction({
      id: belanja.id,
      name: "game",
      icon: "package",
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.message).toBe(M.nameTaken);
    expect(belanja.name).toBe("Belanja");
  });

  it.each([
    ["milik user lain", () => aniKopi.id],
    ["tidak ada", () => "00000000-0000-4000-8000-999999999999"],
    ["bukan UUID (cat-ani-1)", () => "cat-ani-1"],
  ])("kategori %s → Kategori tidak ditemukan", async (_, id) => {
    const result = await updateCategoryAction({
      id: id(),
      name: "Diretas",
      icon: "coffee",
    });
    expect(result).toEqual({
      success: false,
      error: { code: "NOT_FOUND", message: M.notFound },
    });
    expect(aniKopi.name).toBe("Kopi");
    expectNoRevalidate();
  });
});

describe("archiveCategoryAction", () => {
  it("mengarsipkan kategori (yang sudah dipakai) milik user", async () => {
    const result = await archiveCategoryAction({ id: makan.id });
    expect(result.success).toBe(true);
    expect(makan.archivedAt).toBeInstanceOf(Date);
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  it("kategori aktif terakhir per jenis tidak bisa diarsipkan", async () => {
    const result = await archiveCategoryAction({ id: gaji.id });
    expect(result).toEqual({
      success: false,
      error: { code: "CONFLICT", message: M.lastActive },
    });
    expect(gaji.archivedAt).toBeNull();
  });

  it("dua arsip berurutan: yang kedua ditolak (minimal 1 aktif)", async () => {
    expect((await archiveCategoryAction({ id: makan.id })).success).toBe(true);
    const second = await archiveCategoryAction({ id: belanja.id });
    expect(second.success).toBe(false);
    expect(belanja.archivedAt).toBeNull();
  });

  it("kategori user lain / id tidak valid → Kategori tidak ditemukan", async () => {
    for (const id of [aniKopi.id, "cat-ani-1", undefined]) {
      const result = await archiveCategoryAction({ id });
      expect(result.success || result.error.code).toBe("NOT_FOUND");
    }
    expect(aniKopi.archivedAt).toBeNull();
  });
});

describe("restoreCategoryAction", () => {
  it("mengaktifkan kembali kategori terarsip", async () => {
    const game = store.categories.find((c) => c.name === "Game")!;
    const result = await restoreCategoryAction({ id: game.id });
    expect(result.success).toBe(true);
    expect(game.archivedAt).toBeNull();
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  it("menolak bila nama bentrok dengan kategori aktif (data lama)", async () => {
    const dup = add(BUDI, "belanja", { archivedAt: new Date() });
    const result = await restoreCategoryAction({ id: dup.id });
    expect(result).toEqual({
      success: false,
      error: { code: "CONFLICT", message: M.nameTaken },
    });
    expect(dup.archivedAt).not.toBeNull();
  });

  it("menolak bila sudah mencapai batas kategori aktif", async () => {
    for (let i = 2; i < CATEGORY_ACTIVE_MAX; i++) add(BUDI, `Kategori ${i}`);
    const game = store.categories.find((c) => c.name === "Game")!;
    const result = await restoreCategoryAction({ id: game.id });
    expect(result.success || result.error.message).toBe(M.limitReached);
  });

  it("kategori user lain → Kategori tidak ditemukan", async () => {
    aniKopi.archivedAt = new Date();
    const result = await restoreCategoryAction({ id: aniKopi.id });
    expect(result.success || result.error.code).toBe("NOT_FOUND");
    expect(aniKopi.archivedAt).not.toBeNull();
  });
});

describe("deleteCategoryAction", () => {
  it("menghapus permanen kategori yang belum pernah dipakai", async () => {
    const result = await deleteCategoryAction({ id: belanja.id });
    expect(result.success).toBe(true);
    expect(store.categories).not.toContain(belanja);
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  it("kategori yang sudah dipakai transaksi tidak bisa dihapus (arsipkan saja)", async () => {
    const result = await deleteCategoryAction({ id: makan.id });
    expect(result).toEqual({
      success: false,
      error: { code: "CONFLICT", message: M.inUse },
    });
    expect(store.categories).toContain(makan);
  });

  it("kategori aktif terakhir per jenis tidak bisa dihapus", async () => {
    const result = await deleteCategoryAction({ id: gaji.id });
    expect(result.success || result.error.message).toBe(M.lastActive);
  });

  it("kategori terarsip yang belum dipakai boleh dihapus", async () => {
    const game = store.categories.find((c) => c.name === "Game")!;
    expect((await deleteCategoryAction({ id: game.id })).success).toBe(true);
  });

  it("kategori user lain → Kategori tidak ditemukan, tidak terhapus", async () => {
    const result = await deleteCategoryAction({ id: aniKopi.id });
    expect(result).toEqual({
      success: false,
      error: { code: "NOT_FOUND", message: M.notFound },
    });
    expect(store.categories).toContain(aniKopi);
  });
});
