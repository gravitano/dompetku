import { NotebookPenIcon, PlusIcon } from "lucide-react";

import { TransactionFormDialog } from "~/components/transactions/transaction-form-dialog";
import { Button } from "~/components/ui/button";
import type { CategoryOptionsByType } from "~/modules/categories/options";
import { DASHBOARD_MESSAGES as M } from "~/modules/dashboard/view";

/**
 * Empty state pengguna baru tanpa transaksi (E04-US01 AC 10, UX-06): tombol
 * "Catat pengeluaran" membuka form catat pengeluaran (E02-US01).
 */
export function DashboardEmptyState({
  categories,
}: {
  categories: CategoryOptionsByType;
}) {
  return (
    <div
      data-testid="recent-transactions-empty"
      className="mt-6 flex flex-col items-center gap-3 rounded-xl border border-dashed px-4 py-10 text-center"
    >
      <span className="flex size-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <NotebookPenIcon className="size-7" aria-hidden />
      </span>
      <p
        data-testid="dashboard-empty-message"
        className="max-w-60 text-sm text-muted-foreground"
      >
        {M.emptyTitle}
      </p>
      <TransactionFormDialog
        categories={categories}
        trigger={
          <Button data-testid="dashboard-empty-cta">
            <PlusIcon aria-hidden />
            {M.emptyCta}
          </Button>
        }
      />
    </div>
  );
}
