"use server";

import { fail, ok, type ActionResult } from "~/lib/action-result";
import { currentMonthKey } from "~/lib/date";
import { isFaultInjected } from "~/lib/fault-injection";
import { requireUser, UnauthorizedError } from "~/lib/session";

import { getTrendReport } from "./queries";
import { TREND_MESSAGES, type TrendReport } from "./trend";

/**
 * Muat ulang tren 6 bulan (E04-US03, tombol "Coba lagi" UX-05) tanpa
 * me-refresh seluruh halaman — grafik kategori di atasnya tidak tersentuh.
 * `userId` selalu dari session; bulan berjalan dari jam server.
 */
export async function loadTrendReport(): Promise<ActionResult<TrendReport>> {
  try {
    const user = await requireUser();
    if (await isFaultInjected("reports-trend-load")) {
      throw new Error("Simulasi gagal memuat tren (E2E)");
    }
    return ok(await getTrendReport(user.id, currentMonthKey()));
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return fail("UNAUTHORIZED", error.message);
    }
    console.error("[laporan] gagal memuat tren 6 bulan", error);
    return fail("INTERNAL_ERROR", TREND_MESSAGES.loadError);
  }
}
