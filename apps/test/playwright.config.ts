import path from "node:path";

import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";

/**
 * Playwright E2E — package `e2e` (struktur HAIE: `web/`, nanti `mobile/`).
 * - Dari root repo: `pnpm test:e2e` (semua), `pnpm test:e2e web/smoke` (smoke),
 *   `--project mobile|desktop` untuk satu viewport.
 * - Env: variabel di environment menang; sisanya diambil dari `apps/web/.env`
 *   (mis. `DATABASE_URL` untuk fixture DB & server yang dinyalakan).
 * - Set `E2E_BASE_URL` untuk menguji server yang sudah jalan (mis. staging);
 *   tanpa itu, Playwright menyalakan app `web` (`pnpm --filter web dev`, atau
 *   `start` bila `E2E_WEB_COMMAND=start` — jalankan `pnpm build` dulu) di
 *   port `E2E_PORT`/`PORT` dari environment (default 3100, agar tidak bentrok
 *   dengan `pnpm dev` di 3000; `PORT` di `apps/web/.env` diabaikan).
 */
const PORT = Number(process.env.E2E_PORT ?? process.env.PORT ?? 3100);
// Dibakukan sebelum `.env` dimuat: worker Playwright mewarisi env proses utama
// (termasuk `PORT` dari `.env`) dan mengevaluasi ulang config ini.
process.env.E2E_PORT = String(PORT);

dotenv.config({
  path: path.resolve(__dirname, "../web/.env"),
  quiet: true,
});

const baseURL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`;
const webCommand = process.env.E2E_WEB_COMMAND === "start" ? "start" : "dev";

export default defineConfig({
  testDir: "web",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL,
    locale: "id-ID",
    timezoneId: "Asia/Jakarta",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "mobile",
      use: {
        ...devices["Pixel 7"],
        viewport: { width: 390, height: 844 },
      },
    },
    {
      name: "desktop",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 800 },
      },
    },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: `pnpm --filter web ${webCommand}`,
        url: `${baseURL}/api/health`,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        env: {
          PORT: String(PORT),
          // URL publik app harus sama dengan origin yang diuji (better-auth).
          BETTER_AUTH_URL: baseURL,
          APP_URL: baseURL,
          ...(process.env.DATABASE_URL
            ? { DATABASE_URL: process.env.DATABASE_URL }
            : {}),
        },
      },
});
