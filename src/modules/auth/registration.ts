import "server-only";

import { generateRandomString, hashPassword } from "better-auth/crypto";

import type { PrismaClient } from "~/generated/prisma/client";
import { prisma } from "~/lib/prisma";
import { seedDefaultCategories } from "~/modules/categories/defaults";

import type { RegisterInput } from "./schema";

/** Email sudah dipakai akun lain (dibandingkan dalam lowercase). */
export class EmailTakenError extends Error {
  readonly code = "EMAIL_TAKEN" as const;
  constructor() {
    super("Email sudah terdaftar");
    this.name = "EmailTakenError";
  }
}

export type RegistrationDb = Pick<PrismaClient, "$transaction" | "user">;

export type CreatedAccount = { id: string; name: string; email: string };

/** Panjang ID sama dengan default `generateId()` better-auth. */
const ID_LENGTH = 32;

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: unknown }).code === "P2002"
  );
}

/**
 * Buat user + akun credential + kategori bawaan dalam SATU transaksi, sehingga
 * tidak pernah ada user tanpa kategori bawaan (E01-US01 AC 7).
 *
 * Struktur data identik dengan hasil sign-up better-auth: tabel `accounts`
 * dengan `providerId = "credential"` dan password di-hash scrypt
 * (`better-auth/crypto`), sehingga akun langsung bisa login lewat better-auth.
 *
 * @throws EmailTakenError bila email sudah terdaftar (termasuk race condition
 *         double submit, ditangkap dari unique constraint `users.email`).
 */
export async function createAccountWithDefaults(
  input: Pick<RegisterInput, "name" | "email" | "password">,
  db: RegistrationDb = prisma,
): Promise<CreatedAccount> {
  const email = input.email.trim().toLowerCase();

  const existing = await db.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (existing) throw new EmailTakenError();

  const passwordHash = await hashPassword(input.password);
  const userId = generateRandomString(ID_LENGTH);

  try {
    return await db.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          id: userId,
          name: input.name,
          email,
          emailVerified: false,
          accounts: {
            create: {
              id: generateRandomString(ID_LENGTH),
              accountId: userId,
              providerId: "credential",
              password: passwordHash,
            },
          },
        },
        select: { id: true, name: true, email: true },
      });
      await seedDefaultCategories(user.id, tx);
      return user;
    });
  } catch (error) {
    if (isUniqueViolation(error)) throw new EmailTakenError();
    throw error;
  }
}
