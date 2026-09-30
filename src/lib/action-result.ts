/**
 * Format result standar Server Action (ITA §5.3).
 *
 * Contoh pemakaian di `src/modules/<domain>/actions.ts`:
 *
 *   export async function createTransaction(input: unknown): Promise<ActionResult<{ id: string }>> {
 *     const user = await requireUser();          // lempar UnauthorizedError bila belum login
 *     const parsed = schema.safeParse(input);
 *     if (!parsed.success) return fromZodError(parsed.error);
 *     ...
 *     return ok({ id });
 *   }
 */
import type { ZodError } from "zod";

export const ERROR_CODES = [
  "VALIDATION_ERROR",
  "UNAUTHORIZED",
  "NOT_FOUND",
  "CONFLICT",
  "INTERNAL_ERROR",
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

export type ErrorDetail = { field: string; message: string };

export type ActionError = {
  code: ErrorCode;
  message: string;
  details?: ErrorDetail[];
};

export type ActionSuccess<T> = { success: true; data: T };
export type ActionFailure = { success: false; error: ActionError };
export type ActionResult<T = void> = ActionSuccess<T> | ActionFailure;

export function ok<T>(data: T): ActionSuccess<T>;
export function ok(): ActionSuccess<void>;
export function ok<T>(data?: T): ActionSuccess<T | void> {
  return { success: true, data };
}

export function fail(
  code: ErrorCode,
  message: string,
  details?: ErrorDetail[],
): ActionFailure {
  return {
    success: false,
    error: details ? { code, message, details } : { code, message },
  };
}

/** Ubah ZodError → VALIDATION_ERROR dengan detail per field. */
export function fromZodError(
  error: ZodError,
  message = "Data yang dikirim tidak valid",
): ActionFailure {
  const details = error.issues.map((issue) => ({
    field: issue.path.join("."),
    message: issue.message,
  }));
  return fail("VALIDATION_ERROR", details[0]?.message ?? message, details);
}

export const DEFAULT_ERROR_MESSAGES: Record<ErrorCode, string> = {
  VALIDATION_ERROR: "Data yang dikirim tidak valid",
  UNAUTHORIZED: "Sesi berakhir. Silakan masuk kembali.",
  NOT_FOUND: "Data tidak ditemukan",
  CONFLICT: "Data sudah ada",
  INTERNAL_ERROR: "Terjadi kesalahan. Coba lagi nanti.",
};
