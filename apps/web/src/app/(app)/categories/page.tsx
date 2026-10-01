import type { Metadata } from "next";

import { CategoriesView } from "~/components/categories/categories-view";
import { requireUserOrRedirect } from "~/lib/session";
import { getManagedCategories } from "~/modules/categories/queries";
import { parseCategoryTab } from "~/modules/categories/schema";

export const metadata: Metadata = { title: "Kategori" };

/**
 * Kelola kategori (E02-US05): semua kategori milik user session (aktif &
 * terarsip) + jumlah transaksi. Tab awal dari `?type=income|expense`.
 */
export default async function Page({ searchParams }: PageProps<"/categories">) {
  const user = await requireUserOrRedirect();
  const { type } = await searchParams;
  const categories = await getManagedCategories(user.id);

  return (
    <CategoriesView
      categories={categories}
      initialTab={parseCategoryTab(type)}
    />
  );
}
