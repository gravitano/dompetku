# DompetKu

Aplikasi web pencatat keuangan pribadi: catat pemasukan & pengeluaran, atur anggaran bulanan per kategori, dan lihat laporan grafik.

Dokumen acuan: [`docs/project/03-ITA.md`](docs/project/03-ITA.md) (arsitektur, stack, konvensi) dan spesifikasi fitur di [`docs/features/`](docs/features/).

**Stack:** Next.js (App Router, TypeScript) · PostgreSQL + Prisma · better-auth · Tailwind CSS + shadcn/ui · Vitest · Playwright.

## Quick start

Butuh Node.js ≥ 22, pnpm, dan Docker.

```bash
# 1. Clone & setup
git clone git@github.com:gravitano/dompetku.git
cd dompetku
cp .env.example .env          # isi BETTER_AUTH_SECRET: openssl rand -base64 32
pnpm install

# 2. Start database & app
docker compose up -d db
pnpm db:migrate
pnpm db:seed
pnpm dev

# 3. Buka http://localhost:3000
```

Akun demo (dari `pnpm db:seed`, password `Password123`): `budi@example.com`, `ani@example.com`, `lock@example.com`, `baru@example.com`.

## Perintah

| Perintah                    | Keterangan                                        |
| --------------------------- | ------------------------------------------------- |
| `pnpm dev`                  | Next.js dev server                                |
| `pnpm build` / `pnpm start` | Build & jalankan mode production                  |
| `pnpm lint`                 | ESLint + typecheck (`pnpm typecheck` saja: tsc)   |
| `pnpm format`               | Prettier                                          |
| `pnpm test`                 | Unit test (Vitest)                                |
| `pnpm test:e2e`             | E2E test (Playwright, butuh DB + seed)            |
| `pnpm db:migrate`           | `prisma migrate dev`                              |
| `pnpm db:seed`              | Isi user demo, kategori bawaan & contoh transaksi |
| `pnpm db:generate`          | Generate Prisma Client (`src/generated/prisma`)   |

E2E pertama kali: `pnpm exec playwright install chromium`. Smoke test: `pnpm test:e2e test/web/smoke`.

## Struktur folder

```
src/
├── app/
│   ├── (app)/            # Area login: /, /transactions, /budgets, /reports (butuh session)
│   ├── (auth)/           # /login, /register
│   └── api/              # /api/auth/* (better-auth), /api/health
├── components/
│   ├── ui/               # shadcn/ui
│   └── <module>/         # Komponen per modul: layout, auth, transactions, categories, budgets, reports
├── modules/<domain>/     # Logika server saja: actions.ts, queries.ts, schema.ts (tanpa komponen)
├── lib/                  # auth, auth-client, session, prisma, format, date, action-result
├── generated/prisma/     # Prisma Client (hasil generate, tidak di-commit)
└── proxy.ts              # Proteksi route (cek cookie session)
prisma/                   # schema.prisma, migrations, seed.ts
test/web/                 # Playwright: features, pages, fixtures, smoke, regression
deploy/                   # Compose staging/production, Caddyfile, backup.sh (tanpa secret)
```

Konvensi:

- Import alias `~/*` → `src/*` (mis. `import { Button } from "~/components/ui/button"`).
- Komponen React di `~/components/<module>/**`; `src/modules/<domain>/` hanya untuk logika server.
- File kebab-case, komponen PascalCase, tabel DB snake_case (`@@map`).
- `data-testid` kebab-case, mis. `bottom-nav-home`, `sidebar-nav-transactions`, `account-menu-button`.
- Server Action mengembalikan `ActionResult` (`~/lib/action-result`) dan mengambil `userId` dari `requireUser()` (`~/lib/session`).
- Commit: Conventional Commits (`feat(transactions): ...`).

## Deploy

Staging & production berjalan sebagai compose project terpisah di satu VPS (lihat `deploy/` dan ITA §8). Secret disimpan di `deploy/.env.staging` / `deploy/.env.production` di VPS, tidak pernah di repo.
