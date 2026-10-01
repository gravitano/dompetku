"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArchiveIcon,
  CircleAlertIcon,
  EllipsisIcon,
  LoaderCircleIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { useRef, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";

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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import type { ActionResult } from "~/lib/action-result";
import { cn } from "~/lib/utils";
import {
  archiveCategoryAction,
  createCategoryAction,
  deleteCategoryAction,
  updateCategoryAction,
} from "~/modules/categories/actions";
import type { ManagedCategory } from "~/modules/categories/options";
import {
  CATEGORY_MESSAGES as M,
  CATEGORY_NAME_MAX_LENGTH,
  categoryFormSchema,
  isCategoryField,
  type CategoryFormInput,
  type CategoryFormValues,
  type CategoryKind,
} from "~/modules/categories/schema";

import { CategoryIcon } from "./category-icon";
import { CategoryIconPicker } from "./category-icon-picker";

type Busy = "save" | "archive" | "delete" | null;

type CategoryFormSheetProps = {
  open: boolean;
  /** Jenis kategori baru (mengikuti tab aktif). */
  type: CategoryKind;
  /** Mode ubah; `null` = tambah kategori. */
  category: ManagedCategory | null;
  onClose: () => void;
  /** Aksi berhasil: tutup sheet lalu tampilkan toast `message`. */
  onDone: (message: string, action: "save" | "archive" | "delete") => void;
};

/** Pesan gagal yang ditampilkan dari hasil Server Action. */
function failureMessage(result: ActionResult<unknown>): string {
  if (result.success) return "";
  const { error } = result;
  return error.code === "INTERNAL_ERROR" || !error.message
    ? M.systemError
    : error.message;
}

/** "12 transaksi", "2 anggaran", atau "12 transaksi dan 2 anggaran". */
function usageLabel(category: ManagedCategory): string {
  return [
    category.transactionCount > 0
      ? `${category.transactionCount} transaksi`
      : null,
    category.budgetCount > 0 ? `${category.budgetCount} anggaran` : null,
  ]
    .filter(Boolean)
    .join(" dan ");
}

/**
 * Form kategori (E02-US05): *bottom sheet* di HP, dialog di desktop. Tambah
 * (nama + ikon, jenis = tab aktif) atau ubah; mode ubah menampilkan "Hapus
 * kategori" (belum dipakai, dengan konfirmasi) atau "Arsipkan kategori" +
 * penjelasan (sudah dipakai). Kategori belum dipakai juga bisa diarsipkan
 * lewat menu ⋯. Gagal → pesan error, isi form tetap.
 */
export function CategoryFormSheet({
  open,
  type,
  category,
  onClose,
  onDone,
}: CategoryFormSheetProps) {
  const editing = !!category;
  const [busy, setBusy] = useState<Busy>(null);
  const [alert, setAlert] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const busyRef = useRef(false);
  const nameRef = useRef<HTMLInputElement | null>(null);

  const {
    control,
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<CategoryFormValues, unknown, CategoryFormInput>({
    resolver: zodResolver(categoryFormSchema),
    mode: "onSubmit",
    reValidateMode: "onChange",
    defaultValues: {
      name: category?.name ?? "",
      icon: (category?.icon ?? "") as CategoryFormValues["icon"],
    },
  });
  const nameField = register("name");
  const name = useWatch({ control, name: "name" }) ?? "";
  const icon = useWatch({ control, name: "icon" }) as string;
  const disabled = busy !== null;
  // Sudah dipakai transaksi atau anggaran (E03-US01) → hanya bisa diarsipkan.
  const used =
    (category?.transactionCount ?? 0) > 0 || (category?.budgetCount ?? 0) > 0;

  /** Jalankan satu aksi (guard klik ganda); `true` bila berhasil. */
  async function run(
    kind: Exclude<Busy, null>,
    action: () => Promise<ActionResult<unknown>>,
    onFailure: (result: ActionResult<unknown> | null) => void,
  ): Promise<boolean> {
    if (busyRef.current) return false;
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
    if (result?.success) return true;
    busyRef.current = false;
    setBusy(null);
    onFailure(result);
    return false;
  }

  async function onSubmit(values: CategoryFormInput) {
    const ok = await run(
      "save",
      () =>
        category
          ? updateCategoryAction({ ...values, id: category.id })
          : createCategoryAction({ ...values, type }),
      (result) => {
        if (!result || result.success) {
          setAlert(M.systemError);
          return;
        }
        const fields = (result.error.details ?? []).filter((d) =>
          isCategoryField(d.field),
        );
        if (result.error.code === "VALIDATION_ERROR" && fields.length > 0) {
          fields.forEach((detail, index) =>
            setError(
              detail.field as keyof CategoryFormValues,
              { type: "server", message: detail.message },
              { shouldFocus: index === 0 },
            ),
          );
          return;
        }
        setAlert(failureMessage(result));
      },
    );
    if (ok) onDone(editing ? M.updated : M.created, "save");
  }

  async function archive() {
    if (!category) return;
    const ok = await run(
      "archive",
      () => archiveCategoryAction({ id: category.id }),
      (result) => setAlert(result ? failureMessage(result) : M.systemError),
    );
    if (ok) onDone(M.archived, "archive");
  }

  async function confirmDelete() {
    if (!category) return;
    setDeleteError(null);
    const ok = await run(
      "delete",
      () => deleteCategoryAction({ id: category.id }),
      (result) =>
        setDeleteError(result ? failureMessage(result) : M.systemError),
    );
    if (ok) {
      setConfirmOpen(false);
      onDone(M.deleted, "delete");
    }
  }

  function requestClose() {
    if (busyRef.current) return;
    onClose();
  }

  const nameTooLong = name.trim().length > CATEGORY_NAME_MAX_LENGTH;

  return (
    <>
      <DialogPrimitive.Root
        open={open}
        onOpenChange={(next) => {
          if (!next) requestClose();
        }}
      >
        <TransactionSheetContent
          data-testid="category-form-sheet"
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            // UX-03: fokus di Nama saat menambah; mode ubah tanpa keyboard.
            if (!editing) nameRef.current?.focus();
          }}
        >
          <form
            noValidate
            data-testid="category-form"
            data-type={type}
            aria-busy={disabled}
            className="flex min-h-0 flex-1 flex-col"
            onSubmit={(event) => {
              if (busyRef.current) {
                event.preventDefault();
                return;
              }
              void handleSubmit(onSubmit)(event);
            }}
          >
            <div className="flex items-center gap-2 border-b px-4 pt-4 pb-3">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Tutup"
                data-testid="category-cancel-button"
                disabled={disabled}
                onClick={requestClose}
              >
                <XIcon />
              </Button>
              <DialogPrimitive.Title
                data-testid="category-form-title"
                className="flex-1 text-lg font-semibold"
              >
                {editing ? "Ubah Kategori" : "Tambah Kategori"}
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="sr-only">
                {type === "INCOME"
                  ? "Kategori pemasukan: isi nama dan pilih ikon."
                  : "Kategori pengeluaran: isi nama dan pilih ikon."}
              </DialogPrimitive.Description>
              {editing && !used ? (
                <DropdownMenu modal={false}>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Aksi lain"
                      data-testid="category-more-button"
                      disabled={disabled}
                    >
                      <EllipsisIcon />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="z-50">
                    <DropdownMenuItem
                      data-testid="category-archive-button"
                      onSelect={() => void archive()}
                    >
                      <ArchiveIcon aria-hidden />
                      Arsipkan kategori
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : null}
            </div>

            <fieldset
              disabled={disabled}
              className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-4 py-4"
            >
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="category-name">Nama</Label>
                <div className="flex items-center gap-2">
                  <span
                    aria-hidden
                    data-testid="category-icon-preview"
                    data-icon={icon || undefined}
                    className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground"
                  >
                    <CategoryIcon icon={icon || null} />
                  </span>
                  <Input
                    id="category-name"
                    data-testid="category-name-input"
                    type="text"
                    autoComplete="off"
                    enterKeyHint="done"
                    placeholder="Mis. Kopi"
                    className="h-10"
                    aria-invalid={!!errors.name}
                    aria-describedby={
                      errors.name
                        ? "category-name-counter category-name-error"
                        : "category-name-counter"
                    }
                    {...nameField}
                    ref={(el) => {
                      nameField.ref(el);
                      nameRef.current = el;
                    }}
                  />
                </div>
                <div className="flex items-start justify-between gap-2">
                  {errors.name?.message ? (
                    <p
                      id="category-name-error"
                      data-testid="category-name-error"
                      role="alert"
                      className="text-sm text-destructive"
                    >
                      {errors.name.message}
                    </p>
                  ) : null}
                  <span
                    id="category-name-counter"
                    data-testid="category-name-counter"
                    className={cn(
                      "ml-auto text-xs text-muted-foreground tabular-nums",
                      nameTooLong && "text-destructive",
                    )}
                  >
                    {name.trim().length}/{CATEGORY_NAME_MAX_LENGTH}
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <span
                  id="category-icon-label"
                  className="text-sm leading-none font-medium"
                >
                  Ikon
                </span>
                <Controller
                  control={control}
                  name="icon"
                  render={({ field }) => (
                    <CategoryIconPicker
                      id="category-icon"
                      value={field.value ?? ""}
                      onChange={field.onChange}
                      labelledBy="category-icon-label"
                      invalid={!!errors.icon}
                      describedBy={
                        errors.icon ? "category-icon-error" : undefined
                      }
                      disabled={disabled}
                    />
                  )}
                />
                {errors.icon?.message ? (
                  <p
                    id="category-icon-error"
                    data-testid="category-icon-error"
                    role="alert"
                    className="text-sm text-destructive"
                  >
                    {errors.icon.message}
                  </p>
                ) : null}
              </div>
            </fieldset>

            <div className="flex flex-col gap-3 border-t px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
              {alert ? (
                <div
                  role="alert"
                  data-testid="category-form-alert"
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
                data-testid="category-submit-button"
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
              {category && !used ? (
                <Button
                  type="button"
                  variant="ghost"
                  data-testid="category-delete-button"
                  className="h-10 w-full text-destructive hover:bg-destructive/10 hover:text-destructive"
                  disabled={disabled}
                  onClick={() => {
                    setDeleteError(null);
                    setConfirmOpen(true);
                  }}
                >
                  <Trash2Icon aria-hidden />
                  Hapus kategori
                </Button>
              ) : null}
              {category && used ? (
                <div className="flex flex-col gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    data-testid="category-archive-button"
                    className="h-10 w-full text-muted-foreground"
                    disabled={disabled}
                    aria-busy={busy === "archive"}
                    onClick={() => void archive()}
                  >
                    {busy === "archive" ? (
                      <LoaderCircleIcon className="animate-spin" aria-hidden />
                    ) : (
                      <ArchiveIcon aria-hidden />
                    )}
                    Arsipkan kategori
                  </Button>
                  <p
                    data-testid="category-archive-help"
                    className="text-center text-xs text-muted-foreground"
                  >
                    Kategori ini dipakai di {usageLabel(category)}, sehingga
                    tidak bisa dihapus. Arsipkan untuk menyembunyikannya dari
                    form.
                  </p>
                </div>
              ) : null}
            </div>
          </form>
        </TransactionSheetContent>
      </DialogPrimitive.Root>

      {category && !used ? (
        <Dialog
          open={confirmOpen}
          onOpenChange={(next) => {
            if (!busyRef.current || next) setConfirmOpen(next);
          }}
        >
          <DialogContent
            role="alertdialog"
            showCloseButton={false}
            data-testid="category-delete-dialog"
          >
            <DialogHeader>
              <DialogTitle data-testid="category-delete-title">
                Hapus kategori {category.name}?
              </DialogTitle>
              <DialogDescription>
                Kategori ini belum pernah dipakai transaksi maupun anggaran dan
                akan dihapus permanen.
              </DialogDescription>
            </DialogHeader>
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
