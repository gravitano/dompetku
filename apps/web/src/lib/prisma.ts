import "server-only";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "~/generated/prisma/client";

/**
 * Prisma client singleton.
 * Di development, instance disimpan di globalThis agar tidak membuat koneksi
 * baru setiap hot reload.
 */
function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL belum di-set");
  }
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

const globalForPrisma = globalThis as unknown as {
  prisma?: ReturnType<typeof createPrismaClient>;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
