/**
 * Seed data lokal/staging: user demo + kategori bawaan + contoh transaksi.
 * Jalankan: `pnpm db:seed` (idempotent — aman dijalankan ulang).
 *
 * Password di-hash dengan `hashPassword` better-auth (scrypt) dan disimpan di
 * tabel `accounts` dengan providerId "credential", persis seperti hasil
 * sign-up better-auth, sehingga akun bisa langsung dipakai login.
 */
import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { generateRandomString, hashPassword } from "better-auth/crypto";

import { PrismaClient } from "../src/generated/prisma/client";
import { addMonths, currentMonthStart, today } from "../src/lib/date";
import { seedDefaultCategories } from "../src/modules/categories/defaults";

const DEMO_PASSWORD = "Password123";

const DEMO_USERS = [
  { email: "budi@example.com", name: "Budi Santoso", withTransactions: true },
  { email: "ani@example.com", name: "Ani Wijaya", withTransactions: true },
  // Akun untuk skenario E2E (lihat test/web/fixtures/accounts.ts)
  { email: "lock@example.com", name: "Akun Terkunci", withTransactions: false },
  { email: "baru@example.com", name: "Pengguna Baru", withTransactions: false },
] as const;

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function upsertCredentialUser(email: string, name: string) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return existing;

  const id = generateRandomString(32);
  const passwordHash = await hashPassword(DEMO_PASSWORD);
  return prisma.user.create({
    data: {
      id,
      email,
      name,
      emailVerified: false,
      accounts: {
        create: {
          id: generateRandomString(32),
          accountId: id,
          providerId: "credential",
          password: passwordHash,
        },
      },
    },
  });
}

/** Contoh transaksi bulan berjalan & bulan lalu (hanya jika user belum punya). */
async function seedSampleTransactions(userId: string) {
  const count = await prisma.transaction.count({ where: { userId } });
  if (count > 0) return 0;

  const categories = await prisma.category.findMany({ where: { userId } });
  const byName = (type: "INCOME" | "EXPENSE", name: string) => {
    const category = categories.find((c) => c.type === type && c.name === name);
    if (!category) throw new Error(`Kategori ${type}/${name} tidak ditemukan`);
    return category.id;
  };

  const thisMonth = currentMonthStart();
  const lastMonth = addMonths(thisMonth, -1);
  const day = (base: Date, d: number) => {
    const date = new Date(base);
    date.setUTCDate(d);
    return date > today() ? today() : date;
  };

  const rows = [
    {
      type: "INCOME",
      cat: "Gaji",
      amount: 8_000_000,
      date: day(thisMonth, 1),
      note: "Gaji bulanan",
    },
    {
      type: "EXPENSE",
      cat: "Tagihan",
      amount: 350_000,
      date: day(thisMonth, 2),
      note: "Listrik",
    },
    {
      type: "EXPENSE",
      cat: "Makan & Minum",
      amount: 25_000,
      date: day(thisMonth, 3),
      note: "Makan siang",
    },
    {
      type: "EXPENSE",
      cat: "Transportasi",
      amount: 18_000,
      date: day(thisMonth, 3),
      note: "Ojek",
    },
    {
      type: "EXPENSE",
      cat: "Belanja",
      amount: 275_000,
      date: day(thisMonth, 5),
      note: "Belanja bulanan",
    },
    {
      type: "INCOME",
      cat: "Gaji",
      amount: 8_000_000,
      date: day(lastMonth, 1),
      note: "Gaji bulanan",
    },
    {
      type: "EXPENSE",
      cat: "Hiburan",
      amount: 120_000,
      date: day(lastMonth, 12),
      note: "Nonton",
    },
    {
      type: "EXPENSE",
      cat: "Kesehatan",
      amount: 95_000,
      date: day(lastMonth, 20),
      note: "Vitamin",
    },
  ] as const;

  const result = await prisma.transaction.createMany({
    data: rows.map((r) => ({
      userId,
      categoryId: byName(r.type, r.cat),
      type: r.type,
      amount: BigInt(r.amount),
      transactionDate: r.date,
      note: r.note,
    })),
  });
  return result.count;
}

async function main() {
  for (const demo of DEMO_USERS) {
    const user = await upsertCredentialUser(demo.email, demo.name);
    const categories = await seedDefaultCategories(user.id, prisma);
    const transactions = demo.withTransactions
      ? await seedSampleTransactions(user.id)
      : 0;
    console.log(
      `✔ ${demo.email}: +${categories} kategori, +${transactions} transaksi`,
    );
  }
  console.log(`Seed selesai. Password semua akun demo: ${DEMO_PASSWORD}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
