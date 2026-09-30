import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { TRANSACTION_MESSAGES as M } from "./schema";

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  findFirst: vi.fn(),
  create: vi.fn(),
  revalidatePath: vi.fn(),
  getTransactionListPage: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("~/lib/prisma", () => ({
  prisma: {
    category: { findFirst: mocks.findFirst },
    transaction: { create: mocks.create },
  },
}));
vi.mock("./queries", () => ({
  getTransactionListPage: mocks.getTransactionListPage,
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

const { createTransactionAction, loadTransactionPageAction } =
  await import("./actions");
const { UnauthorizedError } = await import("~/lib/session");

const USER_ID = "user-budi";
const CATEGORY_ID = "0b5a3c1e-8f2d-4b7a-9c6e-1d2f3a4b5c6d";
const TRANSACTION_ID = "5f0e4a7b-1c2d-4e3f-8a9b-0c1d2e3f4a5b";

const valid = {
  type: "EXPENSE",
  amount: "25000",
  categoryId: CATEGORY_ID,
  transactionDate: "2026-09-30",
  note: " Makan siang ",
};

describe("createTransactionAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-09-30T03:00:00Z")); // 30 Sep 10:00 WIB
    vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.requireUser.mockResolvedValue({ id: USER_ID, name: "Budi" });
    mocks.findFirst.mockResolvedValue({ id: CATEGORY_ID });
    mocks.create.mockResolvedValue({ id: TRANSACTION_ID });
  });

  afterEach(() => vi.useRealTimers());

  it("menyimpan pengeluaran milik user session (BigInt, DATE) lalu revalidate", async () => {
    const result = await createTransactionAction(valid);

    expect(result).toEqual({ success: true, data: { id: TRANSACTION_ID } });
    expect(mocks.findFirst).toHaveBeenCalledWith({
      where: {
        id: CATEGORY_ID,
        userId: USER_ID,
        type: "EXPENSE",
        archivedAt: null,
      },
      select: { id: true },
    });
    expect(mocks.create).toHaveBeenCalledWith({
      data: {
        userId: USER_ID,
        categoryId: CATEGORY_ID,
        type: "EXPENSE",
        amount: BigInt(25_000),
        transactionDate: new Date("2026-09-30T00:00:00Z"),
        note: "Makan siang",
      },
      select: { id: true },
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  it("mengabaikan userId dari input client", async () => {
    await createTransactionAction({ ...valid, userId: "user-lain" });
    expect(mocks.create.mock.calls[0][0].data.userId).toBe(USER_ID);
    expect(mocks.findFirst.mock.calls[0][0].where.userId).toBe(USER_ID);
  });

  it("catatan kosong disimpan sebagai null", async () => {
    await createTransactionAction({ ...valid, note: "" });
    expect(mocks.create.mock.calls[0][0].data.note).toBeNull();
  });

  it("belum login → UNAUTHORIZED tanpa menyentuh database", async () => {
    mocks.requireUser.mockRejectedValue(new UnauthorizedError());

    const result = await createTransactionAction(valid);

    expect(result).toMatchObject({
      success: false,
      error: { code: "UNAUTHORIZED" },
    });
    expect(mocks.findFirst).not.toHaveBeenCalled();
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("input tidak valid → VALIDATION_ERROR per field tanpa menyimpan", async () => {
    const result = await createTransactionAction({
      ...valid,
      amount: "0",
      categoryId: "",
      transactionDate: "2026-10-01",
    });

    expect(result).toMatchObject({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        details: expect.arrayContaining([
          { field: "amount", message: M.amountMin },
          { field: "categoryId", message: M.categoryRequired },
          { field: "transactionDate", message: M.dateFuture },
        ]),
      },
    });
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("menolak tanggal masa depan di server (zona Asia/Jakarta)", async () => {
    const result = await createTransactionAction({
      ...valid,
      transactionDate: "2026-10-01",
    });
    expect(result).toMatchObject({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        details: [{ field: "transactionDate", message: M.dateFuture }],
      },
    });
  });

  it("kategori milik user lain / terarsip / beda jenis → VALIDATION_ERROR di field categoryId", async () => {
    // Filter `userId + type + archivedAt: null` di query membuat ketiga kasus
    // tsb tidak ditemukan.
    mocks.findFirst.mockResolvedValue(null);

    const result = await createTransactionAction(valid);

    expect(result).toEqual({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: M.categoryInvalid,
        details: [{ field: "categoryId", message: M.categoryInvalid }],
      },
    });
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("mencari kategori dengan jenis yang sama dengan transaksi", async () => {
    await createTransactionAction({ ...valid, type: "INCOME" });
    expect(mocks.findFirst.mock.calls[0][0].where.type).toBe("INCOME");
  });

  it("menyimpan pemasukan (E02-US02) dengan jenis INCOME", async () => {
    const result = await createTransactionAction({
      ...valid,
      type: "INCOME",
      amount: "8000000",
      note: "Gaji September",
    });

    expect(result).toEqual({ success: true, data: { id: TRANSACTION_ID } });
    expect(mocks.findFirst).toHaveBeenCalledWith({
      where: {
        id: CATEGORY_ID,
        userId: USER_ID,
        type: "INCOME",
        archivedAt: null,
      },
      select: { id: true },
    });
    expect(mocks.create.mock.calls[0][0].data).toMatchObject({
      userId: USER_ID,
      type: "INCOME",
      amount: BigInt(8_000_000),
      note: "Gaji September",
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  it("pemasukan dengan kategori pengeluaran → VALIDATION_ERROR di categoryId", async () => {
    // Kategori ada, tetapi berjenis EXPENSE → tidak cocok dengan filter INCOME.
    mocks.findFirst.mockImplementation(async ({ where }) =>
      where.type === "EXPENSE" ? { id: CATEGORY_ID } : null,
    );

    const result = await createTransactionAction({ ...valid, type: "INCOME" });

    expect(result).toMatchObject({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        details: [{ field: "categoryId", message: M.categoryInvalid }],
      },
    });
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("kesalahan database → INTERNAL_ERROR dengan pesan Indonesia", async () => {
    mocks.create.mockRejectedValue(new Error("db down"));

    const result = await createTransactionAction(valid);

    expect(result).toEqual({
      success: false,
      error: { code: "INTERNAL_ERROR", message: M.systemError },
    });
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("input bukan objek ditolak", async () => {
    const result = await createTransactionAction(null);
    expect(result).toMatchObject({
      success: false,
      error: { code: "VALIDATION_ERROR" },
    });
  });
});

describe("loadTransactionPageAction (E02-US03 infinite scroll)", () => {
  const request = {
    filter: { month: "2026-09", type: null, categoryIds: [CATEGORY_ID] },
    cursor: {
      date: "2026-09-30",
      createdAt: "2026-09-30T05:00:00.000Z",
      id: TRANSACTION_ID,
    },
  };
  const page = { items: [], dayTotals: {}, nextCursor: null };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-09-30T03:00:00Z"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.requireUser.mockResolvedValue({ id: USER_ID, name: "Budi" });
    mocks.getTransactionListPage.mockResolvedValue(page);
  });

  afterEach(() => vi.useRealTimers());

  it("memuat halaman berikutnya untuk user session", async () => {
    const result = await loadTransactionPageAction({
      ...request,
      userId: "user-lain",
    });
    expect(result).toEqual({ success: true, data: page });
    expect(mocks.getTransactionListPage).toHaveBeenCalledWith(
      USER_ID,
      request.filter,
      request.cursor,
    );
  });

  it("belum login → UNAUTHORIZED tanpa query", async () => {
    mocks.requireUser.mockRejectedValue(new UnauthorizedError());
    const result = await loadTransactionPageAction(request);
    expect(result).toMatchObject({
      success: false,
      error: { code: "UNAUTHORIZED" },
    });
    expect(mocks.getTransactionListPage).not.toHaveBeenCalled();
  });

  it("input tidak valid → VALIDATION_ERROR", async () => {
    const result = await loadTransactionPageAction({
      ...request,
      filter: { ...request.filter, categoryIds: ["bukan-uuid"] },
    });
    expect(result).toMatchObject({
      success: false,
      error: { code: "VALIDATION_ERROR" },
    });
    expect(mocks.getTransactionListPage).not.toHaveBeenCalled();
  });

  it("kesalahan database → INTERNAL_ERROR 'Gagal memuat transaksi.'", async () => {
    mocks.getTransactionListPage.mockRejectedValue(new Error("db down"));
    const result = await loadTransactionPageAction(request);
    expect(result).toEqual({
      success: false,
      error: { code: "INTERNAL_ERROR", message: "Gagal memuat transaksi." },
    });
  });
});
