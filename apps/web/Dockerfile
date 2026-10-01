# syntax=docker/dockerfile:1.7
# Image produksi DompetKu — Next.js output standalone (ITA §8).
#
# Build context = ROOT repo (monorepo pnpm workspace):
#   docker build -f apps/web/Dockerfile -t dompetku .
#   docker build -f apps/web/Dockerfile --target migrate -t dompetku-migrate .

ARG NODE_VERSION=22-alpine

# ---- base -------------------------------------------------------------------
FROM node:${NODE_VERSION} AS base
RUN corepack enable
WORKDIR /app

# ---- deps: install dependency package `web` saja (postinstall = prisma generate)
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json ./apps/web/
COPY apps/test/package.json ./apps/test/
COPY apps/web/prisma ./apps/web/prisma
COPY apps/web/prisma.config.ts ./apps/web/
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --filter web

# ---- build ------------------------------------------------------------------
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter web db:generate && pnpm --filter web build

# ---- migrate: image kecil untuk `prisma migrate deploy` saat deploy ----------
FROM deps AS migrate
ENV NODE_ENV=production
WORKDIR /app/apps/web
CMD ["pnpm", "prisma", "migrate", "deploy"]

# ---- runner -----------------------------------------------------------------
FROM node:${NODE_VERSION} AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN addgroup -S -g 1001 nodejs && adduser -S -u 1001 -G nodejs nextjs

# `outputFileTracingRoot` = root repo, sehingga standalone berisi
# `apps/web/server.js` + `node_modules` hasil tracing dari root workspace.
COPY --from=build --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public
COPY --from=build --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT}/api/health" >/dev/null || exit 1

CMD ["node", "apps/web/server.js"]
