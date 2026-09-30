import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  TRANSACTION_EDIT_MESSAGES as E,
  TRANSACTION_MESSAGES as M,
} from "./schema";

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  findFirst: vi.fn(),
  create: vi.fn(),
  revalidatePath: vi.fn(),
  getTransactionListPage: vi.fn(),
  findTransaction: vi.fn(),
  updateMany: vi.fn(),
  deleteMany: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("~/lib/prisma", () => ({
  prisma: {
    category: { findFirst: mocks.findFirst },
    transaction: {
      create: mocks.create,
      findFirst: mocks.findTransaction,
      updateMany: mocks.updateMany,
      deleteMany: mocks.deleteMany,
    },
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

const {
  createTransactionAction,
  deleteTransactionAction,
  loadTransactionPageAction,
  updateTransactionAction,
} = await import("./actions");
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

describe("updateTransactionAction (E02-US04)", () => {
  const NEW_CATEGORY_ID = "7c1d2e3f-4a5b-4c6d-8e7f-9a0b1c2d3e4f";
  const update = { ...valid, id: TRANSACTION_ID, amount: "30000" };
  const NOT_FOUND = {
    success: false,
    error: { code: "NOT_FOUND", message: E.notFound },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-09-30T03:00:00Z"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.requireUser.mockResolvedValue({ id: USER_ID, name: "Budi" });
    mocks.findTransaction.mockResolvedValue({
      categoryId: CATEGORY_ID,
      type: "EXPENSE",
    });
    mocks.findFirst.mockResolvedValue({ id: CATEGORY_ID });
    mocks.updateMany.mockResolvedValue({ count: 1 });
  });

  afterEach(() => vi.useRealTimers());

  it("mengubah transaksi milik user session (where id + userId) lalu revalidate", async () => {
    const result = await updateTransactionAction({
      ...update,
      userId: "user-lain",
    });

    expect(result).toEqual({ success: true, data: { id: TRANSACTION_ID } });
    expect(mocks.findTransaction).toHaveBeenCalledWith({
      where: { id: TRANSACTION_ID, userId: USER_ID },
      select: { categoryId: true, type: true },
    });
    expect(mocks.updateMany).toHaveBeenCalledWith({
      where: { id: TRANSACTION_ID, userId: USER_ID },
      data: {
        categoryId: CATEGORY_ID,
        type: "EXPENSE",
        amount: BigInt(30_000),
        transactionDate: new Date("2026-09-30T00:00:00Z"),
        note: "Makan siang",
      },
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  it("transaksi milik user lain / tidak ada → NOT_FOUND tanpa mengubah data", async () => {
    mocks.findTransaction.mockResolvedValue(null);

    const result = await updateTransactionAction(update);

    expect(result).toEqual(NOT_FOUND);
    expect(mocks.updateMany).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("terhapus di antara cek & update (count 0) → NOT_FOUND", async () => {
    mocks.updateMany.mockResolvedValue({ count: 0 });
    expect(await updateTransactionAction(update)).toEqual(NOT_FOUND);
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it.each([
    ["id bukan UUID", { ...update, id: "trx-ani-1" }],
    ["tanpa id", { ...valid }],
    ["input null", null],
  ])("%s → NOT_FOUND tanpa query", async (_, input) => {
    expect(await updateTransactionAction(input)).toEqual(NOT_FOUND);
    expect(mocks.findTransaction).not.toHaveBeenCalled();
  });

  it("validasi field sama dengan catat → VALIDATION_ERROR tanpa query", async () => {
    const result = await updateTransactionAction({
      ...update,
      amount: "0",
      transactionDate: "2026-10-01",
    });
    expect(result).toMatchObject({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        details: expect.arrayContaining([
          { field: "amount", message: M.amountMin },
          { field: "transactionDate", message: M.dateFuture },
        ]),
      },
    });
    expect(mocks.findTransaction).not.toHaveBeenCalled();
    expect(mocks.updateMany).not.toHaveBeenCalled();
  });

  it("kategori tidak berubah → boleh walau sudah terarsip (tanpa filter archivedAt)", async () => {
    await updateTransactionAction(update);
    expect(mocks.findFirst).toHaveBeenCalledWith({
      where: { id: CATEGORY_ID, userId: USER_ID, type: "EXPENSE" },
      select: { id: true },
    });
  });

  it("kategori baru wajib aktif, milik user, dan jenis cocok", async () => {
    mocks.findFirst.mockResolvedValue({ id: NEW_CATEGORY_ID });
    await updateTransactionAction({ ...update, categoryId: NEW_CATEGORY_ID });
    expect(mocks.findFirst).toHaveBeenCalledWith({
      where: {
        id: NEW_CATEGORY_ID,
        userId: USER_ID,
        type: "EXPENSE",
        archivedAt: null,
      },
      select: { id: true },
    });
  });

  it("jenis diubah → kategori (walau id sama) harus aktif & berjenis baru", async () => {
    mocks.findFirst.mockResolvedValue(null);
    const result = await updateTransactionAction({ ...update, type: "INCOME" });
    expect(mocks.findFirst.mock.calls[0][0].where).toEqual({
      id: CATEGORY_ID,
      userId: USER_ID,
      type: "INCOME",
      archivedAt: null,
    });
    expect(result).toEqual({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: M.categoryInvalid,
        details: [{ field: "categoryId", message: M.categoryInvalid }],
      },
    });
    expect(mocks.updateMany).not.toHaveBeenCalled();
  });

  it("belum login → UNAUTHORIZED tanpa menyentuh database", async () => {
    mocks.requireUser.mockRejectedValue(new UnauthorizedError());
    const result = await updateTransactionAction(update);
    expect(result).toMatchObject({
      success: false,
      error: { code: "UNAUTHORIZED" },
    });
    expect(mocks.findTransaction).not.toHaveBeenCalled();
  });

  it("kesalahan database → INTERNAL_ERROR 'Gagal menyimpan perubahan. Coba lagi.'", async () => {
    mocks.updateMany.mockRejectedValue(new Error("db down"));
    expect(await updateTransactionAction(update)).toEqual({
      success: false,
      error: { code: "INTERNAL_ERROR", message: E.updateError },
    });
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
});

describe("deleteTransactionAction (E02-US04)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.requireUser.mockResolvedValue({ id: USER_ID, name: "Budi" });
    mocks.deleteMany.mockResolvedValue({ count: 1 });
  });

  it("menghapus transaksi milik user session lalu revalidate", async () => {
    const result = await deleteTransactionAction({
      id: TRANSACTION_ID,
      userId: "user-lain",
    });
    expect(result).toEqual({ success: true, data: { id: TRANSACTION_ID } });
    expect(mocks.deleteMany).toHaveBeenCalledWith({
      where: { id: TRANSACTION_ID, userId: USER_ID },
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  it("transaksi milik user lain / sudah dihapus → NOT_FOUND 'Transaksi tidak ditemukan'", async () => {
    mocks.deleteMany.mockResolvedValue({ count: 0 });
    expect(await deleteTransactionAction({ id: TRANSACTION_ID })).toEqual({
      success: false,
      error: { code: "NOT_FOUND", message: E.notFound },
    });
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("id bukan UUID → NOT_FOUND tanpa query", async () => {
    expect(await deleteTransactionAction({ id: "trx-ani-1" })).toMatchObject({
      success: false,
      error: { code: "NOT_FOUND" },
    });
    expect(mocks.deleteMany).not.toHaveBeenCalled();
  });

  it("belum login → UNAUTHORIZED tanpa query", async () => {
    mocks.requireUser.mockRejectedValue(new UnauthorizedError());
    expect(await deleteTransactionAction({ id: TRANSACTION_ID })).toMatchObject(
      { success: false, error: { code: "UNAUTHORIZED" } },
    );
    expect(mocks.deleteMany).not.toHaveBeenCalled();
  });

  it("kesalahan database → INTERNAL_ERROR 'Gagal menghapus transaksi. Coba lagi.'", async () => {
    mocks.deleteMany.mockRejectedValue(new Error("db down"));
    expect(await deleteTransactionAction({ id: TRANSACTION_ID })).toEqual({
      success: false,
      error: { code: "INTERNAL_ERROR", message: E.deleteError },
    });
  });
});
