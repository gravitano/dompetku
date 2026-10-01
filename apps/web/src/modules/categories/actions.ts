"use server";

import { revalidatePath } from "next/cache";

import {
  fail,
  fromZodError,
  ok,
  type ActionFailure,
  type ActionResult,
} from "~/lib/action-result";
import { requireUser, UnauthorizedError } from "~/lib/session";

import { withCategoryLock, type Tx } from "./lock";
import {
  CATEGORY_ACTIVE_MAX,
  CATEGORY_MESSAGES as M,
  categoryCreateSchema,
  categoryIdSchema,
  categoryRefSchema,
  categoryUpdateSchema,
  normalizeCategoryName,
} from "./schema";

type CategoryResult = ActionResult<{ id: string }>;

/** `userId` dari session, atau `ActionResult` gagal (UNAUTHORIZED / INTERNAL). */
async function sessionUserId(
  context: string,
): Promise<{ userId: string } | { failure: ActionFailure }> {
  try {
    return { userId: (await requireUser()).id };
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return { failure: fail("UNAUTHORIZED", error.message) };
    }
    console.error(`[${context}] gagal membaca session`, error);
    return { failure: fail("INTERNAL_ERROR", M.systemError) };
  }
}

const notFound = () => fail("NOT_FOUND", M.notFound);
const nameTaken = () =>
  fail("VALIDATION_ERROR", M.nameTaken, [
    { field: "name", message: M.nameTaken },
  ]);

/** Id kategori dari input mentah (bukan UUID → `null`). */
function readCategoryId(input: unknown): string | null {
  const id =
    typeof input === "object" && input !== null && "id" in input
      ? (input as { id: unknown }).id
      : undefined;
  const parsed = categoryIdSchema.safeParse(id);
  return parsed.success ? parsed.data : null;
}

/** Nama sudah dipakai kategori lain (aktif maupun terarsip) di jenis yang sama. */
async function isNameTaken(
  tx: Tx,
  where: { userId: string; type: "EXPENSE" | "INCOME"; excludeId?: string },
  name: string,
  activeOnly = false,
): Promise<boolean> {
  const siblings = await tx.category.findMany({
    where: {
      userId: where.userId,
      type: where.type,
      ...(where.excludeId ? { id: { not: where.excludeId } } : {}),
      ...(activeOnly ? { archivedAt: null } : {}),
    },
    select: { name: true },
  });
  const key = normalizeCategoryName(name);
  return siblings.some((s) => normalizeCategoryName(s.name) === key);
}

function countActive(tx: Tx, userId: string, type: "EXPENSE" | "INCOME") {
  return tx.category.count({ where: { userId, type, archivedAt: null } });
}

function findOwned(tx: Tx, id: string, userId: string) {
  return tx.category.findFirst({
    where: { id, userId },
    select: { id: true, type: true, archivedAt: true },
  });
}

/** Selesaikan mutasi: revalidate semua halaman app (form, daftar, filter). */
function done(id: string): CategoryResult {
  revalidatePath("/", "layout");
  return ok({ id });
}

/** Tambah kategori (AC 2–3). Jenis mengikuti tab aktif. */
export async function createCategoryAction(
  input: unknown,
): Promise<CategoryResult> {
  const session = await sessionUserId("createCategoryAction");
  if ("failure" in session) return session.failure;
  const { userId } = session;

  const parsed = categoryCreateSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  const { type, name, icon } = parsed.data;

  try {
    const result = await withCategoryLock(userId, async (tx) => {
      if (await isNameTaken(tx, { userId, type }, name)) return nameTaken();
      if ((await countActive(tx, userId, type)) >= CATEGORY_ACTIVE_MAX) {
        return fail("CONFLICT", M.limitReached);
      }
      const created = await tx.category.create({
        data: { userId, type, name, icon, isDefault: false },
        select: { id: true },
      });
      return ok({ id: created.id });
    });
    return result.success ? done(result.data.id) : result;
  } catch (error) {
    console.error("[createCategoryAction] gagal menyimpan", error);
    return fail("INTERNAL_ERROR", M.systemError);
  }
}

/** Ubah nama & ikon (AC 4). Jenis tidak bisa diubah. */
export async function updateCategoryAction(
  input: unknown,
): Promise<CategoryResult> {
  const session = await sessionUserId("updateCategoryAction");
  if ("failure" in session) return session.failure;
  const { userId } = session;

  if (!readCategoryId(input)) return notFound();
  const parsed = categoryUpdateSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  const { id, name, icon } = parsed.data;

  try {
    const result = await withCategoryLock(userId, async (tx) => {
      const current = await findOwned(tx, id, userId);
      if (!current) return notFound();
      if (
        await isNameTaken(
          tx,
          { userId, type: current.type, excludeId: id },
          name,
        )
      ) {
        return nameTaken();
      }
      const { count } = await tx.category.updateMany({
        where: { id, userId },
        data: { name, icon },
      });
      return count === 0 ? notFound() : ok({ id });
    });
    return result.success ? done(id) : result;
  } catch (error) {
    console.error("[updateCategoryAction] gagal menyimpan", error);
    return fail("INTERNAL_ERROR", M.systemError);
  }
}

/** Arsipkan kategori aktif (AC 5, AC 7). */
export async function archiveCategoryAction(
  input: unknown,
): Promise<CategoryResult> {
  const session = await sessionUserId("archiveCategoryAction");
  if ("failure" in session) return session.failure;
  const { userId } = session;

  const parsed = categoryRefSchema.safeParse(input);
  if (!parsed.success) return notFound();
  const { id } = parsed.data;

  try {
    const result = await withCategoryLock(userId, async (tx) => {
      const current = await findOwned(tx, id, userId);
      if (!current) return notFound();
      if (current.archivedAt) return ok({ id });
      if ((await countActive(tx, userId, current.type)) <= 1) {
        return fail("CONFLICT", M.lastActive);
      }
      await tx.category.updateMany({
        where: { id, userId, archivedAt: null },
        data: { archivedAt: new Date() },
      });
      return ok({ id });
    });
    return result.success ? done(id) : result;
  } catch (error) {
    console.error("[archiveCategoryAction] gagal mengarsipkan", error);
    return fail("INTERNAL_ERROR", M.systemError);
  }
}

/**
 * Aktifkan kembali kategori terarsip (AC 6) — tetap menghormati batas jumlah
 * dan keunikan nama terhadap kategori aktif.
 */
export async function restoreCategoryAction(
  input: unknown,
): Promise<CategoryResult> {
  const session = await sessionUserId("restoreCategoryAction");
  if ("failure" in session) return session.failure;
  const { userId } = session;

  const parsed = categoryRefSchema.safeParse(input);
  if (!parsed.success) return notFound();
  const { id } = parsed.data;

  try {
    const result = await withCategoryLock(userId, async (tx) => {
      const current = await tx.category.findFirst({
        where: { id, userId },
        select: { id: true, type: true, name: true, archivedAt: true },
      });
      if (!current) return notFound();
      if (!current.archivedAt) return ok({ id });
      if (
        (await countActive(tx, userId, current.type)) >= CATEGORY_ACTIVE_MAX
      ) {
        return fail("CONFLICT", M.limitReached);
      }
      if (
        await isNameTaken(
          tx,
          { userId, type: current.type, excludeId: id },
          current.name,
          true,
        )
      ) {
        return fail("CONFLICT", M.nameTaken);
      }
      await tx.category.updateMany({
        where: { id, userId },
        data: { archivedAt: null },
      });
      return ok({ id });
    });
    return result.success ? done(id) : result;
  } catch (error) {
    console.error("[restoreCategoryAction] gagal mengaktifkan", error);
    return fail("INTERNAL_ERROR", M.systemError);
  }
}

/**
 * Hapus permanen kategori yang belum pernah dipakai transaksi maupun anggaran
 * (E02-US05 AC 8, E03-US01). Yang sudah dipakai → `CONFLICT` (arsipkan saja);
 * kategori aktif terakhir juga tidak boleh dihapus. Anggaran dicek di dalam
 * lock yang sama dengan action anggaran; FK `Restrict` transaksi/anggaran →
 * kategori tetap menjadi pengaman terakhir bila data dibuat bersamaan.
 */
export async function deleteCategoryAction(
  input: unknown,
): Promise<CategoryResult> {
  const session = await sessionUserId("deleteCategoryAction");
  if ("failure" in session) return session.failure;
  const { userId } = session;

  const parsed = categoryRefSchema.safeParse(input);
  if (!parsed.success) return notFound();
  const { id } = parsed.data;

  try {
    const result = await withCategoryLock(userId, async (tx) => {
      const current = await findOwned(tx, id, userId);
      if (!current) return notFound();
      if (
        (await tx.transaction.count({ where: { categoryId: id } })) > 0 ||
        (await tx.budget.count({ where: { categoryId: id } })) > 0
      ) {
        return fail("CONFLICT", M.inUse);
      }
      if (
        !current.archivedAt &&
        (await countActive(tx, userId, current.type)) <= 1
      ) {
        return fail("CONFLICT", M.lastActive);
      }
      const { count } = await tx.category.deleteMany({ where: { id, userId } });
      return count === 0 ? notFound() : ok({ id });
    });
    return result.success ? done(id) : result;
  } catch (error) {
    if (isForeignKeyError(error)) return fail("CONFLICT", M.inUse);
    console.error("[deleteCategoryAction] gagal menghapus", error);
    return fail("INTERNAL_ERROR", M.systemError);
  }
}

function isForeignKeyError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: unknown }).code === "P2003"
  );
}
