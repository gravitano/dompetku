# DompetKu — monorepo

Monorepo **pnpm workspaces** (tanpa Turborepo). Jalankan semua perintah dari root (lihat `README.md`):

- `apps/web` — package `web`, app Next.js (Prisma, better-auth, Tailwind + shadcn, unit test Vitest). Baca juga `apps/web/AGENTS.md` sebelum mengubah kode Next.js.
- `apps/test` — package `e2e`, Playwright E2E (struktur HAIE di `apps/test/web/`).
- Env lokal: `apps/web/.env` (contoh: `apps/web/.env.example`).
- Script root: `pnpm dev|build|start|lint|typecheck|format|test|test:e2e|db:*` → `pnpm --filter web …` / `pnpm --filter e2e …`.
