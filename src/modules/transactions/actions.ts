"use server";

import { revalidatePath } from "next/cache";

import {
  fail,
  fromZodError,
  ok,
  type ActionFailure,
  type ActionResult,
} from "~/lib/action-result";
import { parseDateOnly } from "~/lib/date";
import { prisma } from "~/lib/prisma";
import { requireUser, UnauthorizedError } from "~/lib/session";

import type { TransactionListPage } from "./list";
import { getTransactionListPage } from "./queries";
import {
  TRANSACTION_EDIT_MESSAGES,
  TRANSACTION_LIST_MESSAGES,
  TRANSACTION_MESSAGES,
  transactionDeleteSchema,
  transactionIdSchema,
  transactionPageRequestSchema,
  transactionSchema,
  transactionUpdateSchema,
} from "./schema";

/** `userId` dari session, atau `ActionResult` gagal (UNAUTHORIZED / INTERNAL). */
async function sessionUserId(
  context: string,
  internalMessage: string,
): Promise<{ userId: string } | { failure: ActionFailure }> {
  try {
    return { userId: (await requireUser()).id };
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return { failure: fail("UNAUTHORIZED", error.message) };
    }
    console.error(`[${context}] gagal membaca session`, error);
    return { failure: fail("INTERNAL_ERROR", internalMessage) };
  }
}

function notFound(): ActionFailure {
  return fail("NOT_FOUND", TRANSACTION_EDIT_MESSAGES.notFound);
}

/** Id transaksi dari input mentah (bukan UUID → `null`). */
function readTransactionId(input: unknown): string | null {
  const id =
    typeof input === "object" && input !== null && "id" in input
      ? (input as { id: unknown }).id
      : undefined;
  const parsed = transactionIdSchema.safeParse(id);
  return parsed.success ? parsed.data : null;
}

/**
 * Catat transaksi (E02-US01 pengeluaran; E02-US02 pemasukan memakai action
 * yang sama). `userId` selalu dari session. Kategori wajib milik user, jenisnya
 * sama dengan transaksi, dan tidak terarsip — selain itu `VALIDATION_ERROR` di
 * field `categoryId` (tidak membedakan "tidak ada" vs "milik user lain").
 */
export async function createTransactionAction(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  let userId: string;
  try {
    userId = (await requireUser()).id;
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return fail("UNAUTHORIZED", error.message);
    }
    console.error("[createTransactionAction] gagal membaca session", error);
    return fail("INTERNAL_ERROR", TRANSACTION_MESSAGES.systemError);
  }

  const parsed = transactionSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  const { type, amount, categoryId, transactionDate, note } = parsed.data;

  try {
    const category = await prisma.category.findFirst({
      where: { id: categoryId, userId, type, archivedAt: null },
      select: { id: true },
    });
    if (!category) {
      return fail("VALIDATION_ERROR", TRANSACTION_MESSAGES.categoryInvalid, [
        { field: "categoryId", message: TRANSACTION_MESSAGES.categoryInvalid },
      ]);
    }

    const transaction = await prisma.transaction.create({
      data: {
        userId,
        categoryId: category.id,
        type,
        amount: BigInt(amount),
        transactionDate: parseDateOnly(transactionDate),
        note,
      },
      select: { id: true },
    });

    // Beranda & Transaksi dinamis: daftar dan total ikut diperbarui (AC 8).
    revalidatePath("/", "layout");
    return ok({ id: transaction.id });
  } catch (error) {
    console.error("[createTransactionAction] gagal menyimpan", error);
    return fail("INTERNAL_ERROR", TRANSACTION_MESSAGES.systemError);
  }
}

/**
 * Halaman berikutnya daftar transaksi (E02-US03 infinite scroll, AC 9).
 * Filter + cursor divalidasi Zod; `userId` dari session sehingga id kategori
 * milik user lain tidak pernah mengembalikan data (AC 11).
 */
export async function loadTransactionPageAction(
  input: unknown,
): Promise<ActionResult<TransactionListPage>> {
  let userId: string;
  try {
    userId = (await requireUser()).id;
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return fail("UNAUTHORIZED", error.message);
    }
    console.error("[loadTransactionPageAction] gagal membaca session", error);
    return fail("INTERNAL_ERROR", TRANSACTION_LIST_MESSAGES.loadError);
  }

  const parsed = transactionPageRequestSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);

  try {
    const { filter, cursor } = parsed.data;
    return ok(await getTransactionListPage(userId, filter, cursor));
  } catch (error) {
    console.error("[loadTransactionPageAction] gagal memuat", error);
    return fail("INTERNAL_ERROR", TRANSACTION_LIST_MESSAGES.loadError);
  }
}

/**
 * Ubah transaksi (E02-US04). `userId` selalu dari session dan menjadi bagian
 * `where` — transaksi yang tidak ada / milik user lain / id tidak valid →
 * `NOT_FOUND` "Transaksi tidak ditemukan" tanpa membedakan (AC 11). Validasi
 * field sama dengan catat (AC 2). Kategori wajib milik user dan jenisnya sama;
 * kategori terarsip hanya diterima bila tetap kategori transaksi saat ini
 * (jenis tidak berubah) — AC 6.
 */
export async function updateTransactionAction(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const session = await sessionUserId(
    "updateTransactionAction",
    TRANSACTION_EDIT_MESSAGES.updateError,
  );
  if ("failure" in session) return session.failure;
  const { userId } = session;

  // Id tidak valid diperlakukan sama dengan transaksi yang tidak ada.
  if (!readTransactionId(input)) return notFound();
  const parsed = transactionUpdateSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  const { id, type, amount, categoryId, transactionDate, note } = parsed.data;

  try {
    const current = await prisma.transaction.findFirst({
      where: { id, userId },
      select: { categoryId: true, type: true },
    });
    if (!current) return notFound();

    const keepsCategory =
      current.categoryId === categoryId && current.type === type;
    const category = await prisma.category.findFirst({
      where: {
        id: categoryId,
        userId,
        type,
        ...(keepsCategory ? {} : { archivedAt: null }),
      },
      select: { id: true },
    });
    if (!category) {
      return fail("VALIDATION_ERROR", TRANSACTION_MESSAGES.categoryInvalid, [
        { field: "categoryId", message: TRANSACTION_MESSAGES.categoryInvalid },
      ]);
    }

    const { count } = await prisma.transaction.updateMany({
      where: { id, userId },
      data: {
        categoryId: category.id,
        type,
        amount: BigInt(amount),
        transactionDate: parseDateOnly(transactionDate),
        note,
      },
    });
    if (count === 0) return notFound();

    // Daftar, ringkasan & Beranda ikut diperbarui (AC 5).
    revalidatePath("/", "layout");
    return ok({ id });
  } catch (error) {
    console.error("[updateTransactionAction] gagal menyimpan", error);
    return fail("INTERNAL_ERROR", TRANSACTION_EDIT_MESSAGES.updateError);
  }
}

/**
 * Hapus transaksi permanen (E02-US04 AC 7–8). Hanya milik user session;
 * selain itu `NOT_FOUND` tanpa menyentuh data user lain (AC 11).
 */
export async function deleteTransactionAction(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const session = await sessionUserId(
    "deleteTransactionAction",
    TRANSACTION_EDIT_MESSAGES.deleteError,
  );
  if ("failure" in session) return session.failure;
  const { userId } = session;

  const parsed = transactionDeleteSchema.safeParse(input);
  if (!parsed.success) return notFound();
  const { id } = parsed.data;

  try {
    const { count } = await prisma.transaction.deleteMany({
      where: { id, userId },
    });
    if (count === 0) return notFound();

    revalidatePath("/", "layout");
    return ok({ id });
  } catch (error) {
    console.error("[deleteTransactionAction] gagal menghapus", error);
    return fail("INTERNAL_ERROR", TRANSACTION_EDIT_MESSAGES.deleteError);
  }
}
