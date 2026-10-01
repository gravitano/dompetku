import type { Metadata } from "next";

import { BudgetsView } from "~/components/budgets/budgets-view";
import { currentMonthKey } from "~/lib/date";
import { requireUserOrRedirect } from "~/lib/session";
import { getBudgetMonth } from "~/modules/budgets/queries";
import { parseBudgetMonthParam } from "~/modules/budgets/schema";

export const metadata: Metadata = { title: "Anggaran" };

/**
 * Anggaran bulanan per kategori (E03-US01). Bulan dari `?month=YYYY-MM`
 * (default bulan berjalan, maksimal +1 bulan); data milik user session.
 */
export default async function Page({ searchParams }: PageProps<"/budgets">) {
  const user = await requireUserOrRedirect();
  const currentMonth = currentMonthKey();
  const { month: param } = await searchParams;
  const month = parseBudgetMonthParam(param, currentMonth);
  const data = await getBudgetMonth(user.id, month);

  return <BudgetsView data={data} currentMonth={currentMonth} />;
}
