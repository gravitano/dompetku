/**
 * Helper akses database untuk assertion E2E yang tidak terlihat di UI
 * (mis. "akun tidak dibuat", jumlah kategori bawaan) dan untuk menyiapkan data
 * uji terisolasi (akun baru per test, kategori terarsip).
 *
 * Memakai `DATABASE_URL` dari environment (fallback `.env`) — database yang
 * sama dengan server yang diuji. Penulisan hanya ke data milik akun uji yang
 * dibuat helper ini (email unik per test).
 */
import "dotenv/config";

import { generateRandomString, hashPassword } from "better-auth/crypto";
import { Pool } from "pg";

import { DEFAULT_CATEGORIES } from "../../../src/modules/categories/defaults";

export type UserSummary = {
  userId: string;
  name: string;
  expenseCategories: string[];
  incomeCategories: string[];
  transactionCount: number;
};

export type CreatedUser = {
  id: string;
  email: string;
  password: string;
  name: string;
};

export type StoredTransaction = {
  id: string;
  type: "INCOME" | "EXPENSE";
  amount: number;
  transactionDate: string;
  note: string | null;
  categoryName: string;
};

export type StoredCategory = {
  id: string;
  name: string;
  type: "INCOME" | "EXPENSE";
  icon: string | null;
  archived: boolean;
};

/** Baris transaksi uji untuk di-insert langsung (tanpa UI). */
export type SeedTransaction = {
  /** "YYYY-MM-DD". */
  date: string;
  type: "INCOME" | "EXPENSE";
  /** Nama kategori milik user (aktif maupun terarsip). */
  category: string;
  amount: number;
  note?: string | null;
  /** Waktu dicatat; default berurutan sesuai urutan array (terakhir = terbaru). */
  createdAt?: Date;
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

  /**
   * Buat akun uji baru (seperti hasil registrasi): user + kredensial +
   * kategori bawaan, tanpa transaksi.
   */
  async createUser({
    email,
    name,
    password,
  }: {
    email: string;
    name: string;
    password: string;
  }): Promise<CreatedUser> {
    const id = generateRandomString(32);
    const hash = await hashPassword(password);
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        `INSERT INTO users (id, name, email, email_verified, created_at, updated_at)
         VALUES ($1, $2, $3, false, now(), now())`,
        [id, name, email.toLowerCase()],
      );
      await client.query(
        `INSERT INTO accounts (id, account_id, provider_id, user_id, password, created_at, updated_at)
         VALUES ($1, $2, 'credential', $2, $3, now(), now())`,
        [generateRandomString(32), id, hash],
      );
      for (const category of DEFAULT_CATEGORIES) {
        await client.query(
          `INSERT INTO categories (id, user_id, name, type, icon, is_default, created_at, updated_at)
           VALUES (gen_random_uuid(), $1, $2, $3::category_type, $4, true, now(), now())`,
          [id, category.name, category.type, category.icon],
        );
      }
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
    return { id, email: email.toLowerCase(), password, name };
  }

  /** Arsipkan kategori milik user (kategori terarsip tidak boleh jadi pilihan). */
  async archiveCategory(
    userId: string,
    name: string,
    type: "INCOME" | "EXPENSE" = "EXPENSE",
  ) {
    await this.pool.query(
      `UPDATE categories SET archived_at = now(), updated_at = now()
       WHERE user_id = $1 AND name = $2 AND type = $3::category_type`,
      [userId, name, type],
    );
  }

  /** Tambah kategori custom milik user (opsional langsung terarsip). */
  async createCategory(
    userId: string,
    {
      name,
      type = "EXPENSE",
      icon = "package",
      archived = false,
    }: {
      name: string;
      type?: "INCOME" | "EXPENSE";
      icon?: string;
      archived?: boolean;
    },
  ): Promise<string> {
    const { rows } = await this.pool.query<{ id: string }>(
      `INSERT INTO categories (id, user_id, name, type, icon, is_default, archived_at, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, $2, $3::category_type, $4, false,
               CASE WHEN $5 THEN now() END, now(), now())
       RETURNING id`,
      [userId, name, type, icon, archived],
    );
    return rows[0].id;
  }

  /** Semua kategori user (untuk assertion "tidak tersimpan" / status arsip). */
  async getCategories(userId: string): Promise<StoredCategory[]> {
    const { rows } = await this.pool.query<{
      id: string;
      name: string;
      type: "INCOME" | "EXPENSE";
      icon: string | null;
      archived: boolean;
    }>(
      `SELECT id, name, type::text AS type, icon, archived_at IS NOT NULL AS archived
       FROM categories WHERE user_id = $1 ORDER BY type, name`,
      [userId],
    );
    return rows;
  }

  /**
   * Insert transaksi langsung ke database (cepat, untuk data daftar &
   * pagination). `created_at` disimpan dalam UTC seperti Prisma.
   */
  async insertTransactions(
    userId: string,
    rows: readonly SeedTransaction[],
  ): Promise<void> {
    if (rows.length === 0) return;
    const base = Date.now() - rows.length * 1000;
    const { rowCount } = await this.pool.query(
      `INSERT INTO transactions
         (id, user_id, category_id, type, amount, transaction_date, note, created_at, updated_at)
       SELECT gen_random_uuid(), $1, c.id, r.type::category_type, r.amount,
              r.date::date, r.note,
              r.created_at AT TIME ZONE 'UTC', r.created_at AT TIME ZONE 'UTC'
       FROM unnest($2::text[], $3::text[], $4::bigint[], $5::text[], $6::text[], $7::timestamptz[])
            AS r(category, type, amount, date, note, created_at)
       JOIN categories c
         ON c.user_id = $1 AND c.name = r.category AND c.type = r.type::category_type`,
      [
        userId,
        rows.map((r) => r.category),
        rows.map((r) => r.type),
        rows.map((r) => String(r.amount)),
        rows.map((r) => r.date),
        rows.map((r) => r.note ?? null),
        rows.map((r, i) =>
          (r.createdAt ?? new Date(base + i * 1000)).toISOString(),
        ),
      ],
    );
    if (rowCount !== rows.length) {
      throw new Error(
        `insertTransactions: ${rowCount}/${rows.length} baris (kategori tidak ditemukan?)`,
      );
    }
  }

  /** Id kategori milik user berdasarkan nama & jenis. */
  async getCategoryId(
    userId: string,
    name: string,
    type: "INCOME" | "EXPENSE" = "EXPENSE",
  ): Promise<string> {
    const { rows } = await this.pool.query<{ id: string }>(
      `SELECT id FROM categories
       WHERE user_id = $1 AND name = $2 AND type = $3::category_type
       ORDER BY archived_at NULLS FIRST LIMIT 1`,
      [userId, name, type],
    );
    if (!rows[0]) throw new Error(`Kategori ${type}:${name} tidak ditemukan`);
    return rows[0].id;
  }

  /** Semua transaksi user, terbaru dulu. */
  async getTransactions(userId: string): Promise<StoredTransaction[]> {
    const { rows } = await this.pool.query<{
      id: string;
      type: "INCOME" | "EXPENSE";
      amount: string;
      transaction_date: string;
      note: string | null;
      category_name: string;
    }>(
      `SELECT t.id, t.type::text AS type, t.amount::text AS amount,
              to_char(t.transaction_date, 'YYYY-MM-DD') AS transaction_date,
              t.note, c.name AS category_name
       FROM transactions t JOIN categories c ON c.id = t.category_id
       WHERE t.user_id = $1
       ORDER BY t.transaction_date DESC, t.created_at DESC, t.id DESC`,
      [userId],
    );
    return rows.map((row) => ({
      id: row.id,
      type: row.type,
      amount: Number(row.amount),
      transactionDate: row.transaction_date,
      note: row.note,
      categoryName: row.category_name,
    }));
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
