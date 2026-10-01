"use server";

import { revalidatePath } from "next/cache";

import {
  fail,
  fromZodError,
  ok,
  type ActionFailure,
  type ActionResult,
} from "~/lib/action-result";
import { parseMonthKey, shiftMonthKey } from "~/lib/date";
import { requireUser, UnauthorizedError } from "~/lib/session";
import { withCategoryLock, type Tx } from "~/modules/categories/lock";

import {
  BUDGET_MESSAGES as M,
  budgetCopySchema,
  budgetMonthError,
  budgetRefSchema,
  budgetSetSchema,
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

/** Bulan lampau / > +1 bulan → `CONFLICT` (dievaluasi dengan jam server). */
function monthFailure(month: string): ActionFailure | null {
  const message = budgetMonthError(month);
  return message ? fail("CONFLICT", message) : null;
}

/**
 * Kategori pengeluaran AKTIF milik `userId` — satu-satunya yang anggarannya
 * bisa diatur/diubah/dihapus. Kategori terarsip (anggaran lama tetap tampil,
 * read-only), pemasukan, milik user lain, atau tidak ada → `null`.
 */
function findBudgetableCategory(tx: Tx, id: string, userId: string) {
  return tx.category.findFirst({
    where: { id, userId, type: "EXPENSE", archivedAt: null },
    select: { id: true },
  });
}

function done<T>(data: T): ActionResult<T> {
  // Halaman Anggaran, Beranda (ringkasan anggaran, E04-US01) & Kategori.
  revalidatePath("/", "layout");
  return ok(data);
}

/**
 * Atur atau ubah anggaran kategori untuk satu bulan (AC 4, 5, 7): upsert pada
 * unique `(user_id, category_id, period_month)`, sehingga atur ulang selalu
 * mengubah anggaran yang ada. `userId` selalu dari session.
 */
export async function setBudgetAction(
  input: unknown,
): Promise<ActionResult<{ categoryId: string; month: string }>> {
  const session = await sessionUserId("setBudgetAction", M.systemError);
  if ("failure" in session) return session.failure;
  const { userId } = session;

  const parsed = budgetSetSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  const { categoryId, month, amount } = parsed.data;
  const monthError = monthFailure(month);
  if (monthError) return monthError;
  const periodMonth = parseMonthKey(month);

  try {
    const result = await withCategoryLock(userId, async (tx) => {
      if (!(await findBudgetableCategory(tx, categoryId, userId))) {
        return fail("NOT_FOUND", M.categoryNotFound);
      }
      await tx.budget.upsert({
        where: {
          userId_categoryId_periodMonth: { userId, categoryId, periodMonth },
        },
        create: { userId, categoryId, periodMonth, amount: BigInt(amount) },
        update: { amount: BigInt(amount) },
        select: { id: true },
      });
      return ok({ categoryId, month });
    });
    return result.success ? done(result.data) : result;
  } catch (error) {
    console.error("[setBudgetAction] gagal menyimpan", error);
    return fail("INTERNAL_ERROR", M.systemError);
  }
}

/**
 * Hapus anggaran kategori untuk satu bulan (AC 6) → kategori kembali "Belum
 * diatur". Idempoten: anggaran yang sudah tidak ada dianggap berhasil.
 */
export async function deleteBudgetAction(
  input: unknown,
): Promise<ActionResult<{ categoryId: string; month: string }>> {
  const session = await sessionUserId("deleteBudgetAction", M.deleteError);
  if ("failure" in session) return session.failure;
  const { userId } = session;

  const parsed = budgetRefSchema.safeParse(input);
  if (!parsed.success) return fail("NOT_FOUND", M.notFound);
  const { categoryId, month } = parsed.data;
  const monthError = monthFailure(month);
  if (monthError) return monthError;

  try {
    const result = await withCategoryLock(userId, async (tx) => {
      if (!(await findBudgetableCategory(tx, categoryId, userId))) {
        return fail("NOT_FOUND", M.notFound);
      }
      await tx.budget.deleteMany({
        where: { userId, categoryId, periodMonth: parseMonthKey(month) },
      });
      return ok({ categoryId, month });
    });
    return result.success ? done(result.data) : result;
  } catch (error) {
    console.error("[deleteBudgetAction] gagal menghapus", error);
    return fail("INTERNAL_ERROR", M.deleteError);
  }
}

/**
 * Salin semua anggaran bulan sebelumnya ke `month` (AC 9) — hanya bila `month`
 * belum punya anggaran sama sekali, dan hanya untuk kategori pengeluaran yang
 * masih aktif (kategori terarsip dilewati).
 */
export async function copyPreviousBudgetsAction(
  input: unknown,
): Promise<ActionResult<{ copied: number; fromMonth: string }>> {
  const session = await sessionUserId("copyPreviousBudgetsAction", M.copyError);
  if ("failure" in session) return session.failure;
  const { userId } = session;

  const parsed = budgetCopySchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  const { month } = parsed.data;
  const monthError = monthFailure(month);
  if (monthError) return monthError;
  const fromMonth = shiftMonthKey(month, -1);
  const periodMonth = parseMonthKey(month);

  try {
    const result = await withCategoryLock(userId, async (tx) => {
      if ((await tx.budget.count({ where: { userId, periodMonth } })) > 0) {
        return fail("CONFLICT", M.alreadyHasBudgets);
      }
      const previous = await tx.budget.findMany({
        where: {
          userId,
          periodMonth: parseMonthKey(fromMonth),
          category: { userId, type: "EXPENSE", archivedAt: null },
        },
        select: { categoryId: true, amount: true },
      });
      if (previous.length === 0) return fail("NOT_FOUND", M.nothingToCopy);
      const { count } = await tx.budget.createMany({
        data: previous.map((b) => ({
          userId,
          categoryId: b.categoryId,
          periodMonth,
          amount: b.amount,
        })),
        skipDuplicates: true,
      });
      return ok({ copied: count, fromMonth });
    });
    return result.success ? done(result.data) : result;
  } catch (error) {
    console.error("[copyPreviousBudgetsAction] gagal menyalin", error);
    return fail("INTERNAL_ERROR", M.copyError);
  }
}
