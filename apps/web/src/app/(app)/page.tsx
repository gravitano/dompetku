import type { Metadata } from "next";
import { Suspense } from "react";

import { DashboardError } from "~/components/dashboard/dashboard-error";
import { DashboardSkeleton } from "~/components/dashboard/dashboard-skeleton";
import { DashboardView } from "~/components/dashboard/dashboard-view";
import { PageHeader } from "~/components/layout/page-header";
import { AddTransactionButton } from "~/components/transactions/add-transaction-button";
import { currentMonthStart, formatMonthYear } from "~/lib/date";
import { isFaultInjected } from "~/lib/fault-injection";
import { requireUserOrRedirect } from "~/lib/session";
import type { CategoryOptionsByType } from "~/modules/categories/options";
import { getActiveCategories } from "~/modules/categories/queries";
import { getDashboardData } from "~/modules/dashboard/queries";
import type { DashboardView as DashboardData } from "~/modules/dashboard/view";

export const metadata: Metadata = { title: "Beranda" };

/**
 * Beranda — dashboard ringkasan bulan berjalan (E04-US01). Judul periode
 * tampil langsung; ringkasan dimuat di balik skeleton (Suspense) dan FAB "+"
 * dirender terpisah sehingga tetap bisa dipakai saat ringkasan dimuat atau
 * gagal. Semua data milik user session (AC 12).
 */
export default async function Page() {
  const user = await requireUserOrRedirect();
  const now = new Date();
  // Satu query kategori dibagi untuk FAB dan CTA empty state.
  const categories = getActiveCategories(user.id);

  return (
    <>
      <PageHeader
        title="Beranda"
        description={formatMonthYear(currentMonthStart(now))}
        descriptionTestId="dashboard-period"
      />
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent userId={user.id} now={now} categories={categories} />
      </Suspense>
      <Suspense fallback={null}>
        <DashboardFab categories={categories} />
      </Suspense>
    </>
  );
}

type LoadedDashboard = { data: DashboardData; options: CategoryOptionsByType };

async function loadDashboard(
  userId: string,
  now: Date,
  categories: Promise<CategoryOptionsByType>,
): Promise<LoadedDashboard | null> {
  try {
    if (await isFaultInjected("dashboard-load")) {
      throw new Error("Simulasi gagal memuat Beranda (E2E)");
    }
    const [data, options] = await Promise.all([
      getDashboardData(userId, now),
      categories,
    ]);
    return { data, options };
  } catch (error) {
    console.error("[beranda] gagal memuat ringkasan", error);
    return null;
  }
}

/** Ringkasan + anggaran + transaksi terbaru; gagal → pesan + "Coba lagi". */
async function DashboardContent({
  userId,
  now,
  categories,
}: {
  userId: string;
  now: Date;
  categories: Promise<CategoryOptionsByType>;
}) {
  const loaded = await loadDashboard(userId, now, categories);
  if (!loaded) return <DashboardError />;
  // Slot banner peringatan anggaran (AC 4a): E03-US03 mengisi prop `alerts`.
  return <DashboardView data={loaded.data} categories={loaded.options} />;
}

/** FAB "+" catat transaksi (AC 8); disembunyikan bila kategori gagal dimuat. */
async function DashboardFab({
  categories,
}: {
  categories: Promise<CategoryOptionsByType>;
}) {
  const options = await categories.catch(() => null);
  return options ? <AddTransactionButton categories={options} /> : null;
}
