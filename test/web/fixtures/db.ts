/**
 * Helper akses database untuk assertion E2E yang tidak terlihat di UI
 * (mis. "akun tidak dibuat", jumlah kategori bawaan).
 *
 * Memakai `DATABASE_URL` dari environment (fallback `.env`) — database yang
 * sama dengan server yang diuji. Hanya baca data (read-only).
 */
import "dotenv/config";

import { Pool } from "pg";

export type UserSummary = {
  userId: string;
  name: string;
  expenseCategories: string[];
  incomeCategories: string[];
  transactionCount: number;
};

export class TestDb {
  private readonly pool: Pool;

  constructor(connectionString = process.env.DATABASE_URL) {
    if (!connectionString) throw new Error("DATABASE_URL belum di-set");
    this.pool = new Pool({ connectionString, max: 2 });
  }

  /** Jumlah user dengan email tsb (tanpa membedakan huruf besar/kecil). */
  async countUsersByEmail(email: string): Promise<number> {
    const { rows } = await this.pool.query<{ count: string }>(
      "SELECT COUNT(*)::text AS count FROM users WHERE LOWER(email) = LOWER($1)",
      [email],
    );
    return Number(rows[0]?.count ?? 0);
  }

  async getUserSummary(email: string): Promise<UserSummary | null> {
    const user = await this.pool.query<{ id: string; name: string }>(
      "SELECT id, name FROM users WHERE LOWER(email) = LOWER($1)",
      [email],
    );
    const row = user.rows[0];
    if (!row) return null;

    const categories = await this.pool.query<{ name: string; type: string }>(
      `SELECT name, type::text AS type FROM categories
       WHERE user_id = $1 AND is_default = true
       ORDER BY created_at, name`,
      [row.id],
    );
    const transactions = await this.pool.query<{ count: string }>(
      "SELECT COUNT(*)::text AS count FROM transactions WHERE user_id = $1",
      [row.id],
    );
    const byType = (type: string) =>
      categories.rows.filter((c) => c.type === type).map((c) => c.name);

    return {
      userId: row.id,
      name: row.name,
      expenseCategories: byType("EXPENSE"),
      incomeCategories: byType("INCOME"),
      transactionCount: Number(transactions.rows[0]?.count ?? 0),
    };
  }

  async close() {
    await this.pool.end();
  }
}

/** Email unik per test run, mis. `citra+m-1727700000000-ab12@example.com`. */
export function uniqueEmail(prefix: string, tag = ""): string {
  const random = Math.random().toString(36).slice(2, 6);
  const suffix = [tag, Date.now(), random].filter(Boolean).join("-");
  return `${prefix}+${suffix}@example.com`;
}
