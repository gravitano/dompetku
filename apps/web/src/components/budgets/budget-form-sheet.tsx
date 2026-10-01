"use client";

import {
  CircleAlertIcon,
  LoaderCircleIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { useRef, useState } from "react";

import { AmountInput } from "~/components/transactions/amount-input";
import { TransactionSheetContent } from "~/components/transactions/transaction-sheet";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Label } from "~/components/ui/label";
import type { ActionResult } from "~/lib/action-result";
import { formatMonthYear, parseMonthKey } from "~/lib/date";
import { deleteBudgetAction, setBudgetAction } from "~/modules/budgets/actions";
import {
  BUDGET_MESSAGES as M,
  budgetAmountSchema,
} from "~/modules/budgets/schema";
import type { BudgetRow } from "~/modules/budgets/view";

type Busy = "save" | "delete" | null;

type BudgetFormSheetProps = {
  open: boolean;
  /** "YYYY-MM" bulan anggaran. */
  month: string;
  /** Kategori yang dipilih (tap baris). */
  row: BudgetRow | null;
  onClose: () => void;
  /** Aksi berhasil: tutup sheet lalu tampilkan toast `message`. */
  onDone: (message: string) => void;
};

/** Pesan error pertama validasi nominal, atau `null` bila valid. */
function validateAmount(amount: string): string | null {
  const parsed = budgetAmountSchema.safeParse(amount);
  return parsed.success ? null : (parsed.error.issues[0]?.message ?? null);
}

/**
 * Form **Atur Anggaran** (E03-US01 UX-05–07): *bottom sheet* di HP, dialog di
 * desktop. Nominal fokus otomatis (keyboard numerik, format `Rp 1.500.000`),
 * Simpan lebar penuh, dan "Hapus anggaran" (dengan konfirmasi) bila kategori
 * sudah punya anggaran. Gagal → pesan error, nominal tetap.
 */
export function BudgetFormSheet({
  open,
  month,
  row,
  onClose,
  onDone,
}: BudgetFormSheetProps) {
  const [amount, setAmount] = useState(row?.amount?.toString() ?? "");
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [alert, setAlert] = useState<string | null>(null);
  const [busy, setBusy] = useState<Busy>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const busyRef = useRef(false);
  const amountRef = useRef<HTMLInputElement | null>(null);

  const period = formatMonthYear(parseMonthKey(month));
  const disabled = busy !== null;
  const hasBudget = row?.amount !== null && row?.amount !== undefined;

  /** Jalankan satu aksi (guard klik ganda); hasil `null` = koneksi gagal. */
  async function run(
    kind: Exclude<Busy, null>,
    action: () => Promise<ActionResult<unknown>>,
  ): Promise<ActionResult<unknown> | null> {
    if (busyRef.current) return null;
    busyRef.current = true;
    setBusy(kind);
    setAlert(null);
    let result: ActionResult<unknown> | null = null;
    try {
      result = await action();
    } catch {
      // Koneksi terputus / server gagal merespons: data tidak berubah.
      result = null;
    }
    if (!result?.success) {
      busyRef.current = false;
      setBusy(null);
    }
    return result;
  }

  async function submit() {
    if (!row || busyRef.current) return;
    setSubmitted(true);
    const invalid = validateAmount(amount);
    setError(invalid);
    if (invalid) {
      amountRef.current?.focus();
      return;
    }
    const result = await run("save", () =>
      setBudgetAction({ categoryId: row.categoryId, month, amount }),
    );
    if (result?.success) {
      onDone(M.saved);
      return;
    }
    if (!result) {
      setAlert(M.systemError);
      return;
    }
    const field = result.error.details?.find((d) => d.field === "amount");
    if (result.error.code === "VALIDATION_ERROR" && field) {
      setError(field.message);
      amountRef.current?.focus();
      return;
    }
    setAlert(
      result.error.code === "INTERNAL_ERROR" || !result.error.message
        ? M.systemError
        : result.error.message,
    );
  }

  async function confirmDelete() {
    if (!row) return;
    setDeleteError(null);
    const result = await run("delete", () =>
      deleteBudgetAction({ categoryId: row.categoryId, month }),
    );
    if (result?.success) {
      setConfirmOpen(false);
      onDone(M.deleted);
      return;
    }
    setDeleteError(
      !result || result.error.code === "INTERNAL_ERROR"
        ? M.deleteError
        : result.error.message,
    );
  }

  function requestClose() {
    if (busyRef.current) return;
    onClose();
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
          data-testid="budget-form-sheet"
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            amountRef.current?.focus();
          }}
        >
          <form
            noValidate
            data-testid="budget-form"
            aria-busy={disabled}
            className="flex min-h-0 flex-1 flex-col"
            onSubmit={(event) => {
              event.preventDefault();
              void submit();
            }}
          >
            <div className="flex items-center gap-2 border-b px-4 pt-4 pb-3">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Tutup"
                data-testid="budget-cancel-button"
                disabled={disabled}
                onClick={requestClose}
              >
                <XIcon />
              </Button>
              <DialogPrimitive.Title
                data-testid="budget-form-title"
                className="flex-1 text-lg font-semibold"
              >
                Anggaran {row?.name} — {period}
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="sr-only">
                Isi nominal anggaran bulanan kategori ini.
              </DialogPrimitive.Description>
            </div>

            <fieldset
              disabled={disabled}
              className="flex flex-col gap-1.5 px-4 py-4"
            >
              <Label htmlFor="budget-amount">Nominal</Label>
              <AmountInput
                id="budget-amount"
                data-testid="budget-amount-input"
                className="h-12 text-xl font-semibold tabular-nums md:text-xl"
                enterKeyHint="done"
                value={amount}
                aria-invalid={!!error}
                aria-describedby={error ? "budget-amount-error" : undefined}
                ref={amountRef}
                onValueChange={(next) => {
                  setAmount(next);
                  if (submitted) setError(validateAmount(next));
                }}
              />
              {error ? (
                <p
                  id="budget-amount-error"
                  data-testid="budget-amount-error"
                  role="alert"
                  className="text-sm text-destructive"
                >
                  {error}
                </p>
              ) : null}
            </fieldset>

            <div className="flex flex-col gap-3 border-t px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
              {alert ? (
                <div
                  role="alert"
                  data-testid="budget-form-alert"
                  className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                >
                  <CircleAlertIcon
                    className="mt-0.5 size-4 shrink-0"
                    aria-hidden
                  />
                  <span>{alert}</span>
                </div>
              ) : null}
              <Button
                type="submit"
                size="lg"
                data-testid="budget-submit-button"
                className="h-11 w-full text-base"
                disabled={disabled}
                aria-busy={busy === "save"}
              >
                {busy === "save" ? (
                  <>
                    <LoaderCircleIcon className="animate-spin" aria-hidden />
                    Menyimpan...
                  </>
                ) : (
                  "Simpan"
                )}
              </Button>
              {hasBudget ? (
                <Button
                  type="button"
                  variant="ghost"
                  data-testid="budget-delete-button"
                  className="h-10 w-full text-destructive hover:bg-destructive/10 hover:text-destructive"
                  disabled={disabled}
                  onClick={() => {
                    setDeleteError(null);
                    setConfirmOpen(true);
                  }}
                >
                  <Trash2Icon aria-hidden />
                  Hapus anggaran
                </Button>
              ) : null}
            </div>
          </form>
        </TransactionSheetContent>
      </DialogPrimitive.Root>

      {row && hasBudget ? (
        <Dialog
          open={confirmOpen}
          onOpenChange={(next) => {
            if (!busyRef.current || next) setConfirmOpen(next);
          }}
        >
          <DialogContent
            role="alertdialog"
            showCloseButton={false}
            data-testid="budget-delete-dialog"
          >
            <DialogHeader>
              <DialogTitle data-testid="budget-delete-title">
                Hapus anggaran {row.name} untuk {period}?
              </DialogTitle>
              <DialogDescription>
                Kategori ini akan kembali &quot;{M.notSet}&quot; untuk bulan
                tersebut.
              </DialogDescription>
            </DialogHeader>
            {deleteError ? (
              <div
                role="alert"
                data-testid="budget-delete-error"
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
                disabled={busy === "delete"}
                onClick={() => setConfirmOpen(false)}
              >
                Batal
              </Button>
              <Button
                variant="destructive"
                data-testid="confirm-delete-button"
                disabled={busy === "delete"}
                aria-busy={busy === "delete"}
                onClick={() => void confirmDelete()}
              >
                {busy === "delete" ? (
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
