/**
 * Simulasi jaringan untuk Server Action (POST + header `Next-Action`) —
 * dipakai skenario loading, klik ganda, dan koneksi terputus (E02-US01/US02).
 */
import type { Page } from "@playwright/test";

/** Tahan request Server Action (POST + header `Next-Action`). */
export async function delayServerActions(page: Page, ms: number) {
  await page.route("**/*", async (route) => {
    const request = route.request();
    if (request.method() === "POST" && request.headers()["next-action"]) {
      await new Promise((resolve) => setTimeout(resolve, ms));
    }
    await route.fallback();
  });
}

/** Putuskan request Server Action (simulasi koneksi terputus). */
export async function abortServerActions(page: Page) {
  await page.route("**/*", async (route) => {
    const request = route.request();
    if (request.method() === "POST" && request.headers()["next-action"]) {
      await route.abort("internetdisconnected");
      return;
    }
    await route.fallback();
  });
}
