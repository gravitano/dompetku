"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CircleAlertIcon, LoaderCircleIcon, XIcon } from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import {
  Controller,
  useForm,
  useWatch,
  type FieldError,
} from "react-hook-form";

import { CategoryGrid } from "~/components/categories/category-grid";
import { ManageCategoriesLink } from "~/components/categories/manage-categories-link";
import { Button } from "~/components/ui/button";
import { DialogDescription, DialogTitle } from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  formatDate,
  formatDateOnly,
  parseDateOnly,
  toJakartaDateString,
} from "~/lib/date";
import { cn } from "~/lib/utils";
import type {
  CategoryOption,
  CategoryOptionsByType,
} from "~/modules/categories/options";
import { categoriesHref } from "~/modules/categories/schema";
import {
  createTransactionAction,
  updateTransactionAction,
} from "~/modules/transactions/actions";
import type { TransactionListItem } from "~/modules/transactions/list";
import {
  isTransactionField,
  NOTE_MAX_LENGTH,
  TRANSACTION_DATE_MIN,
  TRANSACTION_EDIT_MESSAGES,
  TRANSACTION_MESSAGES,
  transactionSchema,
  type TransactionFormValues,
  type TransactionInput,
  type TransactionType,
} from "~/modules/transactions/schema";

import { AmountInput } from "./amount-input";
import { TransactionTypeToggle } from "./transaction-type-toggle";

const TITLES: Record<TransactionType, string> = {
  EXPENSE: "Catat Pengeluaran",
  INCOME: "Catat Pemasukan",
};

/** Tombol Simpan: warna utama untuk pengeluaran, hijau untuk pemasukan. */
const SUBMIT_TONE: Record<TransactionType, string> = {
  EXPENSE: "",
  INCOME:
    "bg-income-action text-income-action-foreground hover:bg-income-action/90",
};

const RECORDED_TIME = new Intl.DateTimeFormat("id-ID", {
  timeZone: "Asia/Jakarta",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/** "Dicatat 30 Sep 2026, 12:15" (waktu pencatatan, Asia/Jakarta). */
function describeRecordedAt(createdAt: string): string {
  const recordedAt = new Date(createdAt);
  const date = formatDate(parseDateOnly(toJakartaDateString(recordedAt)));
  return `Dicatat ${date}, ${RECORDED_TIME.format(recordedAt)}`;
}

type TransactionFormProps = {
  /** Kategori aktif (tanpa terarsip) sebagai pilihan. */
  categories: CategoryOptionsByType;
  /**
   * Mode ubah (E02-US04): form terisi data transaksi ini, tombol "Simpan
   * perubahan" aktif hanya bila ada perubahan. Tanpa prop ini = mode catat.
   */
  transaction?: TransactionListItem;
  /**
   * Mode ubah: kategori transaksi bila sudah terarsip (`archived: true`) —
   * tetap tampil & boleh dipertahankan, tidak menjadi pilihan baru (AC 6).
   */
  archivedCategory?: CategoryOption;
  /** Nonaktifkan seluruh form dari luar (mis. saat menghapus). */
  busy?: boolean;
  /** Aksi tambahan di bawah tombol simpan (mis. "Hapus transaksi"). */
  footer?: ReactNode;
  /** Tombol ✕ / Batal di header (UX-07). */
  onCancel: () => void;
  onSaved: (type: TransactionType) => void;
  onDirtyChange: (dirty: boolean) => void;
  onPendingChange: (pending: boolean) => void;
  /** Diisi agar dialog bisa memfokuskan Nominal saat terbuka (UX-06). */
  amountRef: RefObject<HTMLInputElement | null>;
};

function shiftDays(date: string, days: number): string {
  const value = parseDateOnly(date);
  value.setUTCDate(value.getUTCDate() + days);
  return formatDateOnly(value);
}

function describeDate(value: string, today: string): string {
  let label: string;
  try {
    label = formatDate(parseDateOnly(value));
  } catch {
    return "";
  }
  if (value === today) return `Hari ini, ${label}`;
  if (value === shiftDays(today, -1)) return `Kemarin, ${label}`;
  return label;
}

function describedBy(...ids: Array<string | false | undefined>) {
  return ids.filter(Boolean).join(" ") || undefined;
}

function FieldMessage({ id, error }: { id: string; error?: FieldError }) {
  if (!error?.message) return null;
  return (
    <p
      id={id}
      data-testid={id}
      role="alert"
      className="text-sm text-destructive"
    >
      {error.message}
    </p>
  );
}

/**
 * Pilihan kategori mode ubah: kategori terarsip milik transaksi hanya tampil
 * (berlabel "Diarsipkan") selama masih menjadi pilihan saat ini — setelah
 * diganti / jenis diubah, tidak bisa dipilih ulang (E02-US04 AC 6).
 */
function withCurrentCategory(
  options: CategoryOption[],
  archivedCategory: CategoryOption | undefined,
  current: { type: TransactionType; categoryId: string },
): CategoryOption[] {
  if (
    !archivedCategory ||
    current.type !== archivedCategory.type ||
    current.categoryId !== archivedCategory.id ||
    options.some((option) => option.id === archivedCategory.id)
  ) {
    return options;
  }
  return [archivedCategory, ...options];
}

/**
 * Form catat transaksi (E02-US01; mode pemasukan E02-US02 lewat toggle jenis,
 * default Pengeluaran). Validasi dijalankan
 * saat Simpan lalu ulang per field saat diubah; data yang sudah diisi tidak
 * pernah dikosongkan saat ada error (AC 7, AC 10).
 */
export function TransactionForm({
  categories,
  transaction,
  archivedCategory,
  busy = false,
  footer,
  onCancel,
  onSaved,
  onDirtyChange,
  onPendingChange,
  amountRef,
}: TransactionFormProps) {
  const [today] = useState(() => toJakartaDateString());
  const [pending, setPending] = useState(false);
  const [systemError, setSystemError] = useState<string | null>(null);
  // Guard sinkron agar klik ganda cepat tidak mengirim 2 request (AC 9).
  const submittingRef = useRef(false);

  const {
    control,
    register,
    handleSubmit,
    setError,
    setValue,
    clearErrors,
    formState: { errors, isDirty },
  } = useForm<TransactionFormValues, unknown, TransactionInput>({
    resolver: zodResolver(transactionSchema),
    mode: "onSubmit",
    reValidateMode: "onChange",
    defaultValues: transaction
      ? {
          type: transaction.type,
          amount: String(transaction.amount),
          categoryId: transaction.category.id,
          transactionDate: transaction.date,
          note: transaction.note ?? "",
        }
      : {
          type: "EXPENSE",
          amount: "",
          categoryId: "",
          transactionDate: today,
          note: "",
        },
  });

  const type = useWatch({ control, name: "type" });
  const note = useWatch({ control, name: "note" }) ?? "";
  const transactionDate = useWatch({ control, name: "transactionDate" });
  const categoryId = useWatch({ control, name: "categoryId" });
  const editing = !!transaction;
  const disabled = pending || busy;
  const options = withCurrentCategory(categories[type], archivedCategory, {
    type,
    categoryId,
  });
  const noCategories = options.length === 0;
  const messages = {
    systemError: editing
      ? TRANSACTION_EDIT_MESSAGES.updateError
      : TRANSACTION_MESSAGES.systemError,
  };

  useEffect(() => onDirtyChange(isDirty), [isDirty, onDirtyChange]);
  useEffect(() => onPendingChange(pending), [pending, onPendingChange]);

  function finish() {
    submittingRef.current = false;
    setPending(false);
  }

  async function onSubmit(values: TransactionInput) {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setPending(true);
    setSystemError(null);

    const payload = {
      ...values,
      amount: String(values.amount),
      note: values.note ?? "",
    };
    let result: Awaited<ReturnType<typeof createTransactionAction>>;
    try {
      result = transaction
        ? await updateTransactionAction({ ...payload, id: transaction.id })
        : await createTransactionAction(payload);
    } catch {
      // Koneksi terputus / server tidak merespons (AC 10): data form tetap.
      finish();
      setSystemError(messages.systemError);
      return;
    }

    if (result.success) {
      onSaved(values.type);
      return; // Dialog tertutup; tetap nonaktif sampai unmount.
    }

    finish();
    const { error } = result;
    const fieldDetails = (error.details ?? []).filter((d) =>
      isTransactionField(d.field),
    );
    if (error.code === "VALIDATION_ERROR" && fieldDetails.length > 0) {
      fieldDetails.forEach((detail, index) =>
        setError(
          detail.field as keyof TransactionFormValues,
          { type: "server", message: detail.message },
          { shouldFocus: index === 0 },
        ),
      );
      return;
    }
    setSystemError(
      error.code === "INTERNAL_ERROR" || !error.message
        ? messages.systemError
        : error.message,
    );
  }

  const setDate = (value: string) =>
    setValue("transactionDate", value, {
      shouldDirty: true,
      shouldValidate: !!errors.transactionDate,
    });

  return (
    <form
      noValidate
      data-testid="transaction-form"
      data-type={type}
      aria-busy={disabled}
      className="flex min-h-0 flex-1 flex-col"
      onSubmit={(event) => {
        if (submittingRef.current) {
          event.preventDefault();
          return;
        }
        void handleSubmit(onSubmit)(event);
      }}
    >
      <div className="flex flex-col gap-3 border-b px-4 pt-4 pb-3">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Batal"
            data-testid="transaction-cancel-button"
            disabled={disabled}
            onClick={onCancel}
          >
            <XIcon />
          </Button>
          <DialogTitle
            data-testid="transaction-form-title"
            className="text-lg font-semibold"
          >
            {editing ? TRANSACTION_EDIT_MESSAGES.title : TITLES[type]}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {editing
              ? "Ubah nominal, kategori, tanggal, atau catatan lalu tekan Simpan perubahan, atau hapus transaksi."
              : "Isi nominal, kategori, tanggal, dan catatan lalu tekan Simpan."}
          </DialogDescription>
        </div>
        <Controller
          control={control}
          name="type"
          render={({ field }) => (
            <TransactionTypeToggle
              value={field.value}
              disabled={disabled}
              onChange={(next) => {
                if (next === field.value) return;
                // UX-01/UX-05: kategori jenis lain dikosongkan (beserta
                // pesannya); nominal, tanggal & catatan tetap.
                field.onChange(next);
                setValue("categoryId", "", { shouldDirty: true });
                clearErrors("categoryId");
                setSystemError(null);
                if (!editing) amountRef.current?.focus();
              }}
            />
          )}
        />
      </div>

      <fieldset
        disabled={disabled}
        className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-4 py-4"
      >
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="transaction-amount">Nominal</Label>
          <Controller
            control={control}
            name="amount"
            render={({ field }) => (
              <AmountInput
                id="transaction-amount"
                data-testid="transaction-amount-input"
                ref={(el) => {
                  field.ref(el);
                  amountRef.current = el;
                }}
                name={field.name}
                value={field.value}
                onValueChange={field.onChange}
                onBlur={field.onBlur}
                enterKeyHint="done"
                className="h-12 text-2xl font-semibold tabular-nums md:text-2xl"
                aria-invalid={!!errors.amount}
                aria-describedby={
                  errors.amount ? "transaction-amount-error" : undefined
                }
              />
            )}
          />
          <FieldMessage id="transaction-amount-error" error={errors.amount} />
        </div>

        <div className="flex flex-col gap-1.5">
          <span
            id="transaction-category-label"
            className="text-sm leading-none font-medium"
          >
            Kategori
          </span>
          <Controller
            control={control}
            name="categoryId"
            render={({ field }) => (
              <CategoryGrid
                id="transaction-category"
                categories={options}
                value={field.value}
                onChange={field.onChange}
                labelledBy="transaction-category-label"
                invalid={!!errors.categoryId}
                describedBy={
                  errors.categoryId ? "transaction-category-error" : undefined
                }
                tone={type === "INCOME" ? "income" : "expense"}
                emptyMessage={TRANSACTION_MESSAGES.noCategories[type]}
                emptyAction={
                  <ManageCategoriesLink href={categoriesHref(type)} />
                }
              />
            )}
          />
          <FieldMessage
            id="transaction-category-error"
            error={errors.categoryId}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="transaction-date">Tanggal</Label>
          <div className="flex flex-wrap items-center gap-2">
            {[
              { label: "Hari ini", value: today, testId: "today" },
              {
                label: "Kemarin",
                value: shiftDays(today, -1),
                testId: "yesterday",
              },
            ].map((shortcut) => (
              <Button
                key={shortcut.testId}
                type="button"
                variant="outline"
                size="sm"
                data-testid={`transaction-date-${shortcut.testId}`}
                aria-pressed={transactionDate === shortcut.value}
                className={cn(
                  "h-9 px-3",
                  transactionDate === shortcut.value &&
                    "border-primary bg-primary/10",
                )}
                onClick={() => setDate(shortcut.value)}
              >
                {shortcut.label}
              </Button>
            ))}
            <Input
              id="transaction-date"
              data-testid="transaction-date-picker"
              type="date"
              min={TRANSACTION_DATE_MIN}
              max={today}
              required
              className="h-9 w-auto min-w-40 flex-1"
              aria-invalid={!!errors.transactionDate}
              aria-describedby={describedBy(
                "transaction-date-label",
                errors.transactionDate && "transaction-date-error",
              )}
              {...register("transactionDate")}
            />
          </div>
          <p
            id="transaction-date-label"
            data-testid="transaction-date-label"
            className="text-xs text-muted-foreground"
          >
            {describeDate(transactionDate, today)}
          </p>
          <FieldMessage
            id="transaction-date-error"
            error={errors.transactionDate}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="transaction-note">
            Catatan{" "}
            <span className="font-normal text-muted-foreground">
              (opsional)
            </span>
          </Label>
          <Input
            id="transaction-note"
            data-testid="transaction-note-input"
            type="text"
            maxLength={NOTE_MAX_LENGTH}
            autoComplete="off"
            enterKeyHint="done"
            placeholder="Mis. Makan siang di kantor"
            className="h-10"
            aria-invalid={!!errors.note}
            aria-describedby={describedBy(
              "transaction-note-counter",
              errors.note && "transaction-note-error",
            )}
            {...register("note", {
              onChange: (event) => {
                const value: string = event.target.value;
                if (value.length > NOTE_MAX_LENGTH) {
                  setValue("note", value.slice(0, NOTE_MAX_LENGTH));
                }
              },
            })}
          />
          <div className="flex items-start justify-between gap-2">
            <FieldMessage id="transaction-note-error" error={errors.note} />
            <span
              id="transaction-note-counter"
              data-testid="transaction-note-counter"
              className="ml-auto text-xs text-muted-foreground tabular-nums"
            >
              {note.length}/{NOTE_MAX_LENGTH}
            </span>
          </div>
        </div>

        {transaction ? (
          <p
            data-testid="transaction-recorded-at"
            className="text-xs text-muted-foreground"
          >
            {describeRecordedAt(transaction.createdAt)}
          </p>
        ) : null}
      </fieldset>

      <div className="flex flex-col gap-3 border-t px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
        {systemError ? (
          <div
            role="alert"
            data-testid="transaction-form-alert"
            className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            <CircleAlertIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span>{systemError}</span>
          </div>
        ) : null}
        <Button
          type="submit"
          size="lg"
          data-testid={
            editing ? "transaction-update-button" : "transaction-submit-button"
          }
          data-type={type}
          className={cn("h-11 w-full text-base", SUBMIT_TONE[type])}
          // Mode ubah: aktif hanya bila ada perubahan (AC 4).
          disabled={disabled || noCategories || (editing && !isDirty)}
        >
          {pending ? (
            <>
              <LoaderCircleIcon className="animate-spin" aria-hidden />
              Menyimpan...
            </>
          ) : editing ? (
            TRANSACTION_EDIT_MESSAGES.submit
          ) : (
            "Simpan"
          )}
        </Button>
        {footer}
      </div>
    </form>
  );
}
