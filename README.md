# DompetKu

Aplikasi web pencatat keuangan pribadi: catat pemasukan & pengeluaran, atur anggaran bulanan per kategori, dan lihat laporan grafik.

Dokumen acuan: [`docs/project/03-ITA.md`](docs/project/03-ITA.md) (arsitektur, stack, konvensi) dan spesifikasi fitur di [`docs/features/`](docs/features/).

**Stack:** Next.js (App Router, TypeScript) · PostgreSQL + Prisma · better-auth · Tailwind CSS + shadcn/ui · Vitest · Playwright.

Repo ini monorepo **pnpm workspaces**: app Next.js di `apps/web` (package `web`), E2E Playwright di `apps/test` (package `e2e`). Semua perintah dijalankan dari **root**; script root meneruskannya ke package terkait (`pnpm --filter web …` / `pnpm --filter e2e …`).

## Quick start

Butuh Node.js ≥ 22, pnpm, dan Docker.

```bash
# 1. Clone & setup
git clone git@github.com:gravitano/dompetku.git
cd dompetku
cp apps/web/.env.example apps/web/.env   # isi BETTER_AUTH_SECRET: openssl rand -base64 32
pnpm install                             # dari root, untuk semua package

# 2. Start database & app
docker compose up -d db
pnpm db:migrate
pnpm db:seed
pnpm dev

# 3. Buka http://localhost:3000
```

Akun demo (dari `pnpm db:seed`, password `Password123`): `budi@example.com`, `ani@example.com`, `lock@example.com`, `baru@example.com`.

## Perintah

| Perintah                    | Keterangan                                                    |
| --------------------------- | ------------------------------------------------------------- |
| `pnpm dev`                  | Next.js dev server (port 3000, env dari `apps/web/.env`)      |
| `pnpm build` / `pnpm start` | Build & jalankan mode production                              |
| `pnpm lint`                 | ESLint semua package + typecheck (`pnpm typecheck` saja: tsc) |
| `pnpm format`               | Prettier (seluruh repo)                                       |
| `pnpm test`                 | Unit test (Vitest, `apps/web`)                                |
| `pnpm test:e2e`             | E2E test (Playwright, `apps/test`, butuh DB + seed)           |
| `pnpm db:migrate`           | `prisma migrate dev`                                          |
| `pnpm db:seed`              | Isi user demo, kategori bawaan & contoh transaksi             |
| `pnpm db:generate`          | Generate Prisma Client (`apps/web/src/generated/prisma`)      |

Perintah khusus satu package: `pnpm --filter web <script>` atau `pnpm --filter e2e <script>`; tambah dependency: `pnpm --filter web add <pkg>`.

E2E pertama kali: `pnpm --filter e2e exec playwright install chromium`. Smoke test: `pnpm test:e2e web/smoke`. Playwright menyalakan app sendiri di port **3100** (`E2E_PORT`/`PORT` untuk mengganti, `E2E_WEB_COMMAND=start` untuk menguji hasil `pnpm build`, `E2E_BASE_URL` untuk server yang sudah jalan); `DATABASE_URL` diambil dari environment atau `apps/web/.env`.

## Struktur folder

```
apps/
├── web/                      # package `web` — app Next.js
│   ├── src/
│   │   ├── app/
│   │   │   ├── (app)/        # Area login: /, /transactions, /budgets, /reports (butuh session)
│   │   │   ├── (auth)/       # /login, /register
│   │   │   └── api/          # /api/auth/* (better-auth), /api/health
│   │   ├── components/
│   │   │   ├── ui/           # shadcn/ui
│   │   │   └── <module>/     # Komponen per modul: layout, auth, transactions, categories, budgets, reports
│   │   ├── modules/<domain>/ # Logika server saja: actions.ts, queries.ts, schema.ts (tanpa komponen) + unit test
│   │   ├── lib/              # auth, auth-client, session, prisma, format, date, action-result
│   │   ├── generated/prisma/ # Prisma Client (hasil generate, tidak di-commit)
│   │   └── proxy.ts          # Proteksi route (cek cookie session)
│   ├── prisma/               # schema.prisma, migrations, seed.ts
│   ├── Dockerfile            # Image produksi (build context = root repo)
│   └── .env.example          # Salin ke apps/web/.env
└── test/                     # package `e2e` — Playwright
    ├── playwright.config.ts
    └── web/                  # features, pages, fixtures, smoke, regression (nanti `mobile/` untuk Maestro)
deploy/                       # Compose staging/production, Caddyfile, backup.sh (tanpa secret)
docs/  openspec/              # Dokumen HAIE & proposal OpenSpec
```

Konvensi:

- Import alias `~/*` → `apps/web/src/*` (mis. `import { Button } from "~/components/ui/button"`).
- Komponen React di `~/components/<module>/**`; `apps/web/src/modules/<domain>/` hanya untuk logika server.
- File kebab-case, komponen PascalCase, tabel DB snake_case (`@@map`).
- `data-testid` kebab-case, mis. `bottom-nav-home`, `sidebar-nav-transactions`, `account-menu-button`.
- Server Action mengembalikan `ActionResult` (`~/lib/action-result`) dan mengambil `userId` dari `requireUser()` (`~/lib/session`).
- Commit: Conventional Commits (`feat(transactions): ...`).

## Deploy

Staging & production berjalan sebagai compose project terpisah di satu VPS (lihat `deploy/` dan ITA §8). Image dibangun dari root repo: `docker build -f apps/web/Dockerfile -t dompetku .` (target `migrate` untuk image migrasi). Secret disimpan di `deploy/.env.staging` / `deploy/.env.production` di VPS, tidak pernah di repo.
