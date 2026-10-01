"use client";

import { PlusIcon } from "lucide-react";

import type { CategoryOptionsByType } from "~/modules/categories/options";

import { TransactionFormDialog } from "./transaction-form-dialog";

type AddTransactionButtonProps = {
  /** Kategori aktif milik user (tanpa kategori terarsip). */
  categories: CategoryOptionsByType;
};

/**
 * FAB "+" di Beranda & Transaksi (E02-US01 UX-06): satu tap membuka form
 * Catat Pengeluaran dengan fokus di Nominal. Di HP berada di atas bottom nav.
 */
export function AddTransactionButton({
  categories,
}: AddTransactionButtonProps) {
  return (
    <TransactionFormDialog
      categories={categories}
      trigger={
        <button
          type="button"
          data-testid="fab-add-transaction"
          aria-label="Catat transaksi"
          title="Catat transaksi"
          className="fixed right-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-40 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform outline-none hover:bg-primary/90 focus-visible:ring-4 focus-visible:ring-ring/50 active:scale-95 md:right-8 md:bottom-8"
        >
          <PlusIcon className="size-6" aria-hidden />
        </button>
      }
    />
  );
}
