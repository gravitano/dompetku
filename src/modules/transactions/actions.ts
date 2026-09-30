"use server";

import { revalidatePath } from "next/cache";

import { fail, fromZodError, ok, type ActionResult } from "~/lib/action-result";
import { parseDateOnly } from "~/lib/date";
import { prisma } from "~/lib/prisma";
import { requireUser, UnauthorizedError } from "~/lib/session";

import { TRANSACTION_MESSAGES, transactionSchema } from "./schema";

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
