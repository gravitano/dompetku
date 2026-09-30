"use client";

import {
  CircleAlertIcon,
  LoaderCircleIcon,
  SearchXIcon,
  Trash2Icon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Dialog as DialogPrimitive } from "radix-ui";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";

import { CategoryIcon } from "~/components/categories/category-icon";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { formatDate, parseDateOnly } from "~/lib/date";
import type {
  CategoryOption,
  CategoryOptionsByType,
} from "~/modules/categories/options";
import { deleteTransactionAction } from "~/modules/transactions/actions";
import type { TransactionListItem } from "~/modules/transactions/list";
import { TRANSACTION_EDIT_MESSAGES as M } from "~/modules/transactions/schema";

import { TransactionAmount } from "./transaction-amount";
import { TransactionForm } from "./transaction-form";
import {
  DiscardChangesDialog,
  TransactionSheetContent,
} from "./transaction-sheet";

type TransactionDetailSheetProps = {
  /** `null` = tidak ada / sudah dihapus / milik user lain (AC 11). */
  transaction: TransactionListItem | null;
  /** Kategori aktif milik user (pilihan kategori baru). */
  categories: CategoryOptionsByType;
  /** Kategori transaksi bila sudah terarsip (label "Diarsipkan", AC 6). */
  archivedCategory?: CategoryOption;
  /** Daftar asal (beserta filter) / Beranda — tujuan setelah tutup. */
  backHref: string;
  /**
   * `true` bila dirender sebagai modal di atas halaman asal (intercepting
   * route): tutup tanpa perubahan = `router.back()`.
   */
  intercepted: boolean;
};

/**
 * Detail transaksi (E02-US04): form ubah terisi di *bottom sheet* (HP) /
 * dialog (desktop), tombol "Hapus transaksi" dengan konfirmasi, "Buang
 * perubahan?" saat menutup form yang sudah diubah. Setelah simpan/hapus:
 * toast lalu kembali ke daftar asal (data sudah di-revalidate server).
 */
export function TransactionDetailSheet({
  transaction,
  categories,
  archivedCategory,
  backHref,
  intercepted,
}: TransactionDetailSheetProps) {
  const router = useRouter();
  const [open, setOpen] = useState(true);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  /**
   * Data yang ditampilkan dibekukan saat menghapus: revalidate setelah hapus
   * merender ulang route dengan `transaction = null` sebelum navigasi selesai.
   */
  const [frozen, setFrozen] = useState<TransactionListItem | null>(null);
  const dirtyRef = useRef(false);
  const busyRef = useRef(false);
  /** Sudah tersimpan/terhapus: abaikan permintaan tutup berikutnya. */
  const doneRef = useRef(false);
  const amountRef = useRef<HTMLInputElement | null>(null);

  const shown = frozen ?? transaction;

  const onDirtyChange = useCallback((dirty: boolean) => {
    dirtyRef.current = dirty;
  }, []);
  const onPendingChange = useCallback((pending: boolean) => {
    busyRef.current = pending;
    setSaving(pending);
  }, []);

  function leave() {
    setDiscardOpen(false);
    setOpen(false);
    if (intercepted) router.back();
    else router.replace(backHref);
  }

  function finish(message: string) {
    doneRef.current = true;
    setDeleteOpen(false);
    setOpen(false);
    toast.success(message, { duration: 3000 });
    router.replace(backHref);
  }

  function requestClose() {
    if (busyRef.current || doneRef.current) return;
    if (dirtyRef.current) {
      setDiscardOpen(true);
      return;
    }
    leave();
  }

  async function confirmDelete() {
    if (!shown || busyRef.current || doneRef.current) return;
    busyRef.current = true;
    setDeleting(true);
    setDeleteError(null);
    setFrozen(shown);

    let failure: string | null = null;
    try {
      const result = await deleteTransactionAction({ id: shown.id });
      if (!result.success) {
        failure =
          result.error.code === "NOT_FOUND"
            ? result.error.message
            : M.deleteError;
      }
    } catch {
      // Koneksi terputus / server tidak merespons: transaksi tetap ada.
      failure = M.deleteError;
    }

    if (failure === null) {
      finish(M.deleted);
      return;
    }
    busyRef.current = false;
    setDeleting(false);
    setFrozen(null);
    setDeleteError(failure);
  }

  return (
    <>
      <DialogPrimitive.Root
        open={open}
        onOpenChange={(next) => {
          if (!next) requestClose();
        }}
      >
        <TransactionSheetContent
          data-testid={shown ? "transaction-detail" : "transaction-not-found"}
          // Jangan munculkan keyboard HP saat detail dibuka.
          onOpenAutoFocus={(event) => event.preventDefault()}
        >
          {shown ? (
            <TransactionForm
              transaction={shown}
              categories={categories}
              archivedCategory={archivedCategory}
              amountRef={amountRef}
              busy={deleting}
              onCancel={requestClose}
              onDirtyChange={onDirtyChange}
              onPendingChange={onPendingChange}
              onSaved={() => finish(M.updated)}
              footer={
                <Button
                  type="button"
                  variant="ghost"
                  data-testid="transaction-delete-button"
                  className="h-10 w-full text-destructive hover:bg-destructive/10 hover:text-destructive"
                  disabled={saving || deleting}
                  onClick={() => {
                    setDeleteError(null);
                    setDeleteOpen(true);
                  }}
                >
                  <Trash2Icon aria-hidden />
                  Hapus transaksi
                </Button>
              }
            />
          ) : (
            <NotFoundContent onBack={leave} />
          )}
        </TransactionSheetContent>
      </DialogPrimitive.Root>

      <DiscardChangesDialog
        open={discardOpen}
        onOpenChange={setDiscardOpen}
        onDiscard={leave}
        description="Perubahan pada transaksi ini belum disimpan dan akan hilang."
      />

      {shown ? (
        <Dialog
          open={deleteOpen}
          onOpenChange={(next) => {
            if (!busyRef.current || next) setDeleteOpen(next);
          }}
        >
          <DialogContent
            role="alertdialog"
            showCloseButton={false}
            data-testid="delete-confirm-dialog"
          >
            <DialogHeader>
              <DialogTitle>{M.deleteTitle}</DialogTitle>
              <DialogDescription>{M.deleteWarning}</DialogDescription>
            </DialogHeader>
            <div
              data-testid="delete-confirm-summary"
              className="flex items-center gap-3 rounded-lg border bg-muted/40 px-3 py-2.5"
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <CategoryIcon icon={shown.category.icon} className="size-4" />
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate font-medium">
                  {shown.note ?? shown.category.name}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  {shown.category.name} ·{" "}
                  {formatDate(parseDateOnly(shown.date))}
                </span>
              </span>
              <TransactionAmount
                type={shown.type}
                amount={shown.amount}
                className="text-sm"
              />
            </div>
            {deleteError ? (
              <div
                role="alert"
                data-testid="delete-error-alert"
                className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
              >
                <CircleAlertIcon
                  className="mt-0.5 size-4 shrink-0"
                  aria-hidden
                />
                <span>{deleteError}</span>
              </div>
            ) : null}
            <DialogFooter>
              <Button
                variant="outline"
                data-testid="confirm-cancel-button"
                disabled={deleting}
                onClick={() => setDeleteOpen(false)}
              >
                Batal
              </Button>
              <Button
                variant="destructive"
                data-testid="confirm-delete-button"
                disabled={deleting}
                aria-busy={deleting}
                onClick={() => void confirmDelete()}
              >
                {deleting ? (
                  <>
                    <LoaderCircleIcon className="animate-spin" aria-hidden />
                    Menghapus...
                  </>
                ) : (
                  "Hapus"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}
    </>
  );
}

/** Isi sheet saat transaksi tidak ditemukan (AC 11, state Empty). */
function NotFoundContent({ onBack }: { onBack: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 px-4 pt-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <SearchXIcon className="size-6" aria-hidden />
      </span>
      <DialogPrimitive.Title
        data-testid="transaction-not-found-title"
        className="text-lg font-semibold"
      >
        {M.notFound}
      </DialogPrimitive.Title>
      <DialogPrimitive.Description className="text-sm text-muted-foreground">
        Transaksi mungkin sudah dihapus atau tautannya salah.
      </DialogPrimitive.Description>
      <Button
        variant="outline"
        data-testid="transaction-not-found-back"
        className="mt-1"
        onClick={onBack}
      >
        Kembali ke daftar
      </Button>
    </div>
  );
}
