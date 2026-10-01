# DompetKu

Aplikasi web pencatat keuangan pribadi: catat pemasukan & pengeluaran, atur anggaran bulanan per kategori, dan lihat laporan grafik.

Dokumen acuan: [`docs/project/03-ITA.md`](docs/project/03-ITA.md) (arsitektur, stack, konvensi) dan spesifikasi fitur di [`docs/features/`](docs/features/).

**Stack:** Next.js (App Router, TypeScript) · PostgreSQL + Prisma · better-auth · Tailwind CSS + shadcn/ui · Vitest · Playwright.

## Tentang demo ini

DompetKu adalah aplikasi contoh untuk webinar **HAIE** (framework Spec-Driven Development GITS.ID) dan **FRIDAY** (workflow developer berbasis Claude Code). Seluruh isi repo, dari dokumen bisnis sampai kode dan test, dihasilkan lewat alur tersebut dengan AI sebagai pair.

- **Live demo:** https://dompetku-sooty.vercel.app — halaman login menampilkan kotak info **Akun demo**; klik **Pakai akun demo** untuk mengisi email & password, lalu **Masuk** (akun publik, data contoh).
- **Status:** Sprint 1 selesai (7 story: akun, catat/daftar/ubah/hapus transaksi, kelola kategori). Sprint 2 berjalan: E03-US01 atur anggaran kategori, E03-US02 indikator pemakaian anggaran, E03-US03 peringatan anggaran, E04-US01 dashboard ringkasan bulanan (Beranda), dan E04-US02 grafik pengeluaran per kategori (Laporan) selesai; story Anggaran & Laporan lainnya sudah punya spec, belum diimplementasikan.

Akun demo — semua dibuat oleh `pnpm db:seed`, password `Password123`:

| Email              | Keterangan                                       |
| ------------------ | ------------------------------------------------ |
| `budi@example.com` | Akun utama demo, punya 8 transaksi contoh        |
| `ani@example.com`  | Akun kedua — untuk uji isolasi data antar user   |
| `baru@example.com` | Pengguna baru tanpa transaksi (empty state)      |
| `lock@example.com` | Khusus E2E skenario lockout, jangan dipakai demo |

Kotak info akun demo di halaman login hanya tampil bila env server `DEMO_MODE=true` (default `false`, lihat `apps/web/.env.example`).

Telusuri alurnya dari spesifikasi ke kode:

| Tahap                                                       | Lokasi                                                                                          |
| ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Kebutuhan bisnis, rencana, arsitektur                       | [`docs/project/`](docs/project/) — BRD, PEP, ITA                                                |
| Spec per story (story, design + wireframe, testing Gherkin) | [`docs/features/phase-01-mvp/`](docs/features/phase-01-mvp/)                                    |
| Proposal implementasi per story                             | [`openspec/proposals/`](openspec/proposals/)                                                    |
| Implementasi per story                                      | `git log --first-parent development` — satu merge per story, commit ber-footer `HAIE: <story>`  |
| Test otomatis dari skenario Gherkin                         | [`apps/test/web/features/`](apps/test/web/features/) (E2E) dan `*.test.ts` di `apps/web` (unit) |

Tooling HAIE/FRIDAY sendiri (skill, template, CLI) tidak termasuk di repo ini; yang ada adalah hasilnya.

Repo ini monorepo **pnpm workspaces**: app Next.js di `apps/web` (package `web`), E2E Playwright di `apps/test` (package `e2e`). Semua perintah dijalankan dari **root**; script root meneruskannya ke package terkait (`pnpm --filter web …` / `pnpm --filter e2e …`).

## Quick start

Butuh Node.js ≥ 22, pnpm, dan Docker.

```bash
# 1. Clone & setup
git clone https://github.com/gravitano/dompetku.git
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

Akun demo (dari `pnpm db:seed`, password `Password123`): lihat tabel di [Tentang demo ini](#tentang-demo-ini). Set `DEMO_MODE=true` di `apps/web/.env` untuk menampilkan kotak akun demo di halaman login.

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

### Vercel (demo)

Repo terhubung ke Vercel lewat Git integration: push ke `main` = production, branch lain = preview.

- **Root Directory:** `apps/web` (framework Next.js, pnpm workspace terdeteksi otomatis).
- **Build:** `apps/web/vercel.json` menjalankan `pnpm run vercel-build` = `prisma migrate deploy && next build`.
- **Database:** Neon dari Vercel Marketplace — env `DATABASE_URL` (pooled, runtime) dan `DATABASE_URL_UNPOOLED` (migrasi) terisi otomatis.
- **Env lain:** `BETTER_AUTH_SECRET` (wajib, `openssl rand -base64 32`). `BETTER_AUTH_URL` opsional — tanpa itu dipakai domain Vercel.
- **Seed akun demo** (sekali): `DATABASE_URL='<url Neon unpooled>' DATABASE_URL_UNPOOLED='<url Neon unpooled>' pnpm db:seed` (env shell menang atas `apps/web/.env`).

> Lockout login & rate limit registrasi disimpan di memori proses. Di Vercel (serverless, banyak instance) batas itu tidak andal — cukup untuk demo, perlu storage bersama (DB/Redis) untuk production.

### VPS + Docker (rencana ITA)

Staging & production berjalan sebagai compose project terpisah di satu VPS (lihat `deploy/` dan ITA §8). Image dibangun dari root repo: `docker build -f apps/web/Dockerfile -t dompetku .` (target `migrate` untuk image migrasi). Secret disimpan di `deploy/.env.staging` / `deploy/.env.production` di VPS, tidak pernah di repo.
