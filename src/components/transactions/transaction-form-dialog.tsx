"use client";

import { Dialog as DialogPrimitive } from "radix-ui";
import { useCallback, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";

import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from "~/components/ui/dialog";
import type { CategoryOptionsByType } from "~/modules/categories/options";
import { TRANSACTION_MESSAGES } from "~/modules/transactions/schema";

import { TransactionForm } from "./transaction-form";

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
        <DialogPortal>
          {/* z-49: selalu di bawah konten walau overlay di-mount ulang setelah
              konten (buka lagi saat animasi tutup), di atas FAB/nav (z-40). */}
          <DialogOverlay className="z-49" />
          <DialogPrimitive.Content
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
            className="fixed inset-x-0 bottom-0 z-50 flex max-h-[92dvh] flex-col rounded-t-2xl border-t bg-popover text-sm text-popover-foreground shadow-lg outline-none md:inset-x-auto md:top-1/2 md:bottom-auto md:left-1/2 md:max-h-[90dvh] md:w-full md:max-w-md md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-xl md:border data-open:animate-in data-open:fade-in-0 max-md:data-open:slide-in-from-bottom-10 md:data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 max-md:data-closed:slide-out-to-bottom-10 md:data-closed:zoom-out-95"
          >
            <div
              aria-hidden
              className="mx-auto mt-2 h-1.5 w-10 shrink-0 rounded-full bg-muted md:hidden"
            />
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
          </DialogPrimitive.Content>
        </DialogPortal>
      </DialogPrimitive.Root>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent
          role="alertdialog"
          showCloseButton={false}
          data-testid="discard-confirm-dialog"
        >
          <DialogHeader>
            <DialogTitle>Buang perubahan?</DialogTitle>
            <DialogDescription>
              Data yang sudah diisi belum disimpan dan akan hilang.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              data-testid="discard-cancel-button"
              onClick={() => setConfirmOpen(false)}
            >
              Lanjut mengisi
            </Button>
            <Button
              variant="destructive"
              data-testid="discard-confirm-button"
              onClick={close}
            >
              Buang
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
