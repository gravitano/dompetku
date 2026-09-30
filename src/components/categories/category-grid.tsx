"use client";

import { useRef, type KeyboardEvent, type ReactNode } from "react";

import { cn } from "~/lib/utils";
import type { CategoryOption } from "~/modules/categories/options";

import { CategoryIcon } from "./category-icon";

type CategoryGridProps = {
  id: string;
  categories: readonly CategoryOption[];
  value: string;
  onChange: (categoryId: string) => void;
  invalid?: boolean;
  describedBy?: string;
  labelledBy?: string;
  emptyMessage: string;
  /** Aksi di empty state, mis. tautan "Kelola kategori" (E02-US02). */
  emptyAction?: ReactNode;
  /** Warna aksen pilihan: pengeluaran (default) atau pemasukan (hijau). */
  tone?: "expense" | "income";
};

const CHECKED_TONE = {
  expense: "border-primary bg-primary/10 ring-primary hover:bg-primary/10",
  income: "border-income bg-income/10 ring-income hover:bg-income/10",
} as const;

/**
 * Grid ikon + label kategori (E02-US01 UX-02): satu tap memilih, hanya satu
 * yang aktif. Dirender sebagai radiogroup (panah kiri/kanan berpindah pilihan).
 */
export function CategoryGrid({
  id,
  categories,
  value,
  onChange,
  invalid,
  describedBy,
  labelledBy,
  emptyMessage,
  emptyAction,
  tone = "expense",
}: CategoryGridProps) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  if (categories.length === 0) {
    return (
      <div
        id={id}
        data-testid="category-empty"
        className="flex flex-col items-center gap-1 rounded-lg border border-dashed px-3 py-4 text-center text-sm text-muted-foreground"
      >
        <p data-testid="category-empty-message">{emptyMessage}</p>
        {emptyAction}
      </div>
    );
  }

  const selectedIndex = categories.findIndex((c) => c.id === value);

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const step =
      event.key === "ArrowRight" || event.key === "ArrowDown"
        ? 1
        : event.key === "ArrowLeft" || event.key === "ArrowUp"
          ? -1
          : 0;
    if (!step) return;
    event.preventDefault();
    const next = (index + step + categories.length) % categories.length;
    onChange(categories[next].id);
    refs.current[next]?.focus();
  }

  return (
    <div
      id={id}
      role="radiogroup"
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      aria-invalid={invalid || undefined}
      data-testid="category-grid"
      className="grid grid-cols-4 gap-2"
    >
      {categories.map((category, index) => {
        const checked = category.id === value;
        const tabbable = selectedIndex === -1 ? index === 0 : checked;
        return (
          <button
            key={category.id}
            ref={(el) => {
              refs.current[index] = el;
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            data-state={checked ? "checked" : "unchecked"}
            data-testid={`category-option-${category.slug}`}
            data-tone={tone}
            tabIndex={tabbable ? 0 : -1}
            onClick={() => onChange(category.id)}
            onKeyDown={(event) => onKeyDown(event, index)}
            className={cn(
              "flex min-h-18 flex-col items-center justify-center gap-1 rounded-xl border bg-background px-1 py-2 text-center text-xs leading-tight transition-colors outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50",
              checked &&
                cn("font-medium text-foreground ring-1", CHECKED_TONE[tone]),
              invalid && !checked && "border-destructive/50",
            )}
          >
            <CategoryIcon icon={category.icon} />
            <span className="line-clamp-2">{category.name}</span>
            {category.archived ? (
              <span
                data-testid="category-archived-badge"
                className="rounded-full bg-muted px-1.5 py-px text-[10px] leading-tight font-medium text-muted-foreground"
              >
                Diarsipkan
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
