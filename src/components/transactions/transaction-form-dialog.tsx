"use client";

import { Dialog as DialogPrimitive } from "radix-ui";
import { useCallback, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";

import type { CategoryOptionsByType } from "~/modules/categories/options";
import { TRANSACTION_MESSAGES } from "~/modules/transactions/schema";

import { TransactionForm } from "./transaction-form";
import {
  DiscardChangesDialog,
  TransactionSheetContent,
} from "./transaction-sheet";

type TransactionFormDialogProps = {
  categories: CategoryOptionsByType;
  /** Elemen pembuka (mis. FAB "+"), dirender sebagai `Dialog.Trigger`. */
  trigger: ReactNode;
};

/**
 * Wadah form catat transaksi: *bottom sheet* di HP (< md) dan dialog di tengah
 * layar di desktop — satu Radix Dialog dengan kelas responsif (tanpa deteksi
 * viewport di JS). Menutup form yang sudah terisi meminta konfirmasi
 * "Buang perubahan?" (UX-07); selama menyimpan form tidak bisa ditutup.
 */
export function TransactionFormDialog({
  categories,
  trigger,
}: TransactionFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  /**
   * Naik setiap form dibuka: form selalu mulai kosong walau dibuka lagi saat
   * animasi tutup sebelumnya belum selesai (konten Radix belum di-unmount).
   */
  const [session, setSession] = useState(0);
  const dirtyRef = useRef(false);
  const pendingRef = useRef(false);
  const amountRef = useRef<HTMLInputElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  const onDirtyChange = useCallback((dirty: boolean) => {
    dirtyRef.current = dirty;
  }, []);
  const onPendingChange = useCallback((pending: boolean) => {
    pendingRef.current = pending;
  }, []);

  function close() {
    dirtyRef.current = false;
    pendingRef.current = false;
    setConfirmOpen(false);
    setOpen(false);
  }

  function openForm() {
    dirtyRef.current = false;
    pendingRef.current = false;
    setSession((value) => value + 1);
    setOpen(true);
  }

  function requestClose() {
    if (pendingRef.current) return;
    if (dirtyRef.current) {
      setConfirmOpen(true);
      return;
    }
    close();
  }

  return (
    <>
      <DialogPrimitive.Root
        open={open}
        onOpenChange={(next) => (next ? openForm() : requestClose())}
      >
        <DialogPrimitive.Trigger asChild ref={triggerRef}>
          {trigger}
        </DialogPrimitive.Trigger>
        <TransactionSheetContent
          data-testid="transaction-form-dialog"
          // Tap "+" cepat setelah Simpan (saat animasi tutup belum selesai):
          // fokus yang kembali ke FAB dan pointerdown dari tap FAB itu
          // sendiri tidak boleh langsung menutup form yang baru dibuka.
          // Modal sudah mengunci fokus; di luar race ini FAB tertutup overlay.
          onFocusOutside={(event) => event.preventDefault()}
          onPointerDownOutside={(event) => {
            const target = event.target as Node | null;
            if (target && triggerRef.current?.contains(target)) {
              event.preventDefault();
            }
          }}
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            amountRef.current?.focus();
          }}
        >
          <TransactionForm
            key={session}
            categories={categories}
            amountRef={amountRef}
            onCancel={requestClose}
            onDirtyChange={onDirtyChange}
            onPendingChange={onPendingChange}
            onSaved={(type) => {
              close();
              toast.success(TRANSACTION_MESSAGES.saved[type], {
                duration: 3000,
              });
            }}
          />
        </TransactionSheetContent>
      </DialogPrimitive.Root>

      <DiscardChangesDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        onDiscard={close}
      />
    </>
  );
}
