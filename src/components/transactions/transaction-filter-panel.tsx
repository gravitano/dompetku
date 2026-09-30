"use client";

import { CheckIcon, SlidersHorizontalIcon, XIcon } from "lucide-react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { useState } from "react";

import { CategoryIcon } from "~/components/categories/category-icon";
import { Button } from "~/components/ui/button";
import { DialogOverlay, DialogPortal } from "~/components/ui/dialog";
import { cn } from "~/lib/utils";
import type { FilterCategory } from "~/modules/categories/options";
import {
  countActiveFilters,
  type TransactionListFilter,
  type TransactionType,
} from "~/modules/transactions/schema";

import { filterCategoryLabel, TYPE_LABELS } from "./filter-labels";

type Draft = Pick<TransactionListFilter, "type" | "categoryIds">;

type TransactionFilterPanelProps = {
  filter: TransactionListFilter;
  categories: readonly FilterCategory[];
  onApply: (draft: Draft) => void;
};

const TYPE_OPTIONS: ReadonlyArray<{
  value: TransactionType | null;
  key: "all" | "expense" | "income";
  label: string;
}> = [
  { value: null, key: "all", label: "Semua" },
  { value: "EXPENSE", key: "expense", label: TYPE_LABELS.EXPENSE },
  { value: "INCOME", key: "income", label: TYPE_LABELS.INCOME },
];

function CategoryCheckbox({
  category,
  label,
  checked,
  onToggle,
}: {
  category: FilterCategory;
  label: string;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        role="checkbox"
        aria-checked={checked}
        data-testid={`filter-category-${category.key}`}
        data-archived={category.archived || undefined}
        onClick={onToggle}
        className={cn(
          "flex h-11 w-full items-center gap-2 rounded-lg border px-2.5 text-left text-sm transition-colors outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50",
          checked && "border-primary bg-primary/10 hover:bg-primary/10",
        )}
      >
        <span
          aria-hidden
          className={cn(
            "flex size-4 shrink-0 items-center justify-center rounded border",
            checked && "border-primary bg-primary text-primary-foreground",
          )}
        >
          {checked ? <CheckIcon className="size-3" /> : null}
        </span>
        <CategoryIcon
          icon={category.icon}
          className="size-4 shrink-0 text-muted-foreground"
        />
        <span className="min-w-0 truncate">{label}</span>
      </button>
    </li>
  );
}

/**
 * Tombol **Filter** (badge jumlah filter aktif, UX-03) + panel filter Jenis &
 * Kategori: *bottom sheet* di HP, panel ber-anchor kanan atas di desktop.
 * Pilihan disimpan sebagai draft dan baru berlaku saat **Terapkan**; **Reset**
 * langsung melepas semua filter. Memilih jenis menyaring daftar kategori ke
 * jenis tsb (UX-07); kategori terarsip dikelompokkan "Diarsipkan".
 */
export function TransactionFilterPanel({
  filter,
  categories,
  onApply,
}: TransactionFilterPanelProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>({ type: null, categoryIds: [] });
  const activeCount = countActiveFilters(filter);

  function onOpenChange(next: boolean) {
    if (next) setDraft({ type: filter.type, categoryIds: filter.categoryIds });
    setOpen(next);
  }

  function selectType(type: TransactionType | null) {
    setDraft((current) => ({
      type,
      categoryIds: type
        ? current.categoryIds.filter(
            (id) => categories.find((c) => c.id === id)?.type === type,
          )
        : current.categoryIds,
    }));
  }

  function toggleCategory(id: string) {
    setDraft((current) => ({
      ...current,
      categoryIds: current.categoryIds.includes(id)
        ? current.categoryIds.filter((other) => other !== id)
        : [...current.categoryIds, id],
    }));
  }

  function apply(next: Draft) {
    setOpen(false);
    onApply(next);
  }

  const visible = categories.filter(
    (c) => !draft.type || c.type === draft.type,
  );
  const groups = [
    ...(draft.type
      ? [
          {
            key: draft.type.toLowerCase(),
            title: null,
            items: visible.filter((c) => !c.archived),
          },
        ]
      : (["EXPENSE", "INCOME"] as const).map((type) => ({
          key: type.toLowerCase(),
          title: TYPE_LABELS[type],
          items: visible.filter((c) => !c.archived && c.type === type),
        }))),
    {
      key: "archived",
      title: "Diarsipkan",
      items: visible.filter((c) => c.archived),
    },
  ].filter((group) => group.items.length > 0);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Trigger asChild>
        <Button
          variant="outline"
          size="lg"
          data-testid="filter-button"
          data-active-count={activeCount}
          aria-label={
            activeCount > 0 ? `Filter (${activeCount} aktif)` : "Filter"
          }
          className="h-9 gap-1.5 px-3"
        >
          <SlidersHorizontalIcon aria-hidden />
          Filter
          {activeCount > 0 ? (
            <span
              data-testid="filter-button-badge"
              className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-xs font-semibold text-primary-foreground tabular-nums"
            >
              {activeCount}
            </span>
          ) : null}
        </Button>
      </DialogPrimitive.Trigger>
      <DialogPortal>
        <DialogOverlay className="z-49 md:bg-black/10" />
        <DialogPrimitive.Content
          data-testid="filter-panel"
          className="fixed inset-x-0 bottom-0 z-50 flex max-h-[85dvh] flex-col rounded-t-2xl border-t bg-popover text-sm text-popover-foreground shadow-lg outline-none md:inset-x-auto md:top-28 md:right-8 md:bottom-auto md:max-h-[calc(100dvh-8rem)] md:w-[26rem] md:rounded-xl md:border data-open:animate-in data-open:fade-in-0 max-md:data-open:slide-in-from-bottom-10 md:data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 max-md:data-closed:slide-out-to-bottom-10 md:data-closed:zoom-out-95"
        >
          <div
            aria-hidden
            className="mx-auto mt-2 h-1.5 w-10 shrink-0 rounded-full bg-muted md:hidden"
          />
          <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
            <DialogPrimitive.Title className="text-lg font-semibold">
              Filter
            </DialogPrimitive.Title>
            <DialogPrimitive.Description className="sr-only">
              Pilih jenis dan kategori transaksi lalu tekan Terapkan.
            </DialogPrimitive.Description>
            <DialogPrimitive.Close asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Tutup"
                data-testid="filter-close-button"
              >
                <XIcon />
              </Button>
            </DialogPrimitive.Close>
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-4 py-4">
            <div className="flex flex-col gap-2">
              <p
                id="filter-type-label"
                className="text-sm leading-none font-medium"
              >
                Jenis
              </p>
              <div
                role="radiogroup"
                aria-labelledby="filter-type-label"
                data-testid="filter-type"
                className="grid grid-cols-3 gap-1 rounded-lg bg-muted p-1"
              >
                {TYPE_OPTIONS.map((option) => {
                  const checked = draft.type === option.value;
                  return (
                    <button
                      key={option.key}
                      type="button"
                      role="radio"
                      aria-checked={checked}
                      data-testid={`filter-type-${option.key}`}
                      onClick={() => selectType(option.value)}
                      className={cn(
                        "h-8 rounded-md text-sm font-medium text-muted-foreground transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                        checked
                          ? "bg-background text-foreground shadow-sm"
                          : "hover:text-foreground",
                        checked && option.value === "EXPENSE" && "text-expense",
                        checked && option.value === "INCOME" && "text-income",
                      )}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <p className="text-sm leading-none font-medium">Kategori</p>
              {groups.map((group) => (
                <div
                  key={group.key}
                  data-testid={`filter-category-group-${group.key}`}
                  className="flex flex-col gap-2"
                >
                  {group.title ? (
                    <p className="text-xs font-medium text-muted-foreground">
                      {group.title}
                    </p>
                  ) : null}
                  <ul className="grid grid-cols-2 gap-2">
                    {group.items.map((category) => (
                      <CategoryCheckbox
                        key={category.id}
                        category={category}
                        label={filterCategoryLabel(category, categories)}
                        checked={draft.categoryIds.includes(category.id)}
                        onToggle={() => toggleCategory(category.id)}
                      />
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3 border-t px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <Button
              variant="outline"
              size="lg"
              data-testid="filter-reset-button"
              className="h-11 flex-1 text-base"
              onClick={() => apply({ type: null, categoryIds: [] })}
            >
              Reset
            </Button>
            <Button
              size="lg"
              data-testid="filter-apply-button"
              className="h-11 flex-1 text-base"
              onClick={() => apply(draft)}
            >
              Terapkan
            </Button>
          </div>
        </DialogPrimitive.Content>
      </DialogPortal>
    </DialogPrimitive.Root>
  );
}
