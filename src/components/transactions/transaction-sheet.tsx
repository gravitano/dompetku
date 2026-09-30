"use client";

import { Dialog as DialogPrimitive } from "radix-ui";
import type { ComponentProps } from "react";

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
import { cn } from "~/lib/utils";

/**
 * Kelas wadah form transaksi: *bottom sheet* di HP (< md) dan dialog di tengah
 * layar di desktop (tanpa deteksi viewport di JS). Dipakai juga oleh skeleton
 * detail agar posisinya sama persis.
 */
export const TRANSACTION_SHEET_CLASS =
  "fixed inset-x-0 bottom-0 z-50 flex max-h-[92dvh] flex-col rounded-t-2xl border-t bg-popover text-sm text-popover-foreground shadow-lg outline-none md:inset-x-auto md:top-1/2 md:bottom-auto md:left-1/2 md:max-h-[90dvh] md:w-full md:max-w-md md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-xl md:border";

const SHEET_ANIMATION =
  "data-open:animate-in data-open:fade-in-0 max-md:data-open:slide-in-from-bottom-10 md:data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 max-md:data-closed:slide-out-to-bottom-10 md:data-closed:zoom-out-95";

/** Pegangan kecil di atas bottom sheet (hanya HP). */
export function SheetHandle() {
  return (
    <div
      aria-hidden
      className="mx-auto mt-2 h-1.5 w-10 shrink-0 rounded-full bg-muted md:hidden"
    />
  );
}

/**
 * Konten sheet/dialog form transaksi (portal + overlay + konten). Harus
 * berada di dalam `DialogPrimitive.Root`.
 */
export function TransactionSheetContent({
  className,
  children,
  ...props
}: ComponentProps<typeof DialogPrimitive.Content>) {
  return (
    <DialogPortal>
      {/* z-49: selalu di bawah konten walau overlay di-mount ulang setelah
          konten (buka lagi saat animasi tutup), di atas FAB/nav (z-40). */}
      <DialogOverlay className="z-49" />
      <DialogPrimitive.Content
        className={cn(TRANSACTION_SHEET_CLASS, SHEET_ANIMATION, className)}
        {...props}
      >
        <SheetHandle />
        {children}
      </DialogPrimitive.Content>
    </DialogPortal>
  );
}

type DiscardChangesDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDiscard: () => void;
  description?: string;
};

/** Konfirmasi "Buang perubahan?" saat menutup form yang sudah diubah. */
export function DiscardChangesDialog({
  open,
  onOpenChange,
  onDiscard,
  description = "Data yang sudah diisi belum disimpan dan akan hilang.",
}: DiscardChangesDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        role="alertdialog"
        showCloseButton={false}
        data-testid="discard-confirm-dialog"
      >
        <DialogHeader>
          <DialogTitle>Buang perubahan?</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            data-testid="discard-cancel-button"
            onClick={() => onOpenChange(false)}
          >
            Lanjut mengisi
          </Button>
          <Button
            variant="destructive"
            data-testid="discard-confirm-button"
            onClick={onDiscard}
          >
            Buang
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
