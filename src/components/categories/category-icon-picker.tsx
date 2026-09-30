"use client";

import { useRef, type KeyboardEvent } from "react";

import { cn } from "~/lib/utils";
import { CATEGORY_ICONS } from "~/modules/categories/icons";

import { CategoryIcon } from "./category-icon";

type CategoryIconPickerProps = {
  id: string;
  value: string;
  onChange: (icon: string) => void;
  labelledBy?: string;
  describedBy?: string;
  invalid?: boolean;
  disabled?: boolean;
};

/**
 * Grid ikon kategori (E02-US05 UX-09): satu tap memilih, ikon terpilih
 * ter-highlight. Radiogroup — panah berpindah pilihan.
 */
export function CategoryIconPicker({
  id,
  value,
  onChange,
  labelledBy,
  describedBy,
  invalid,
  disabled,
}: CategoryIconPickerProps) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const selectedIndex = CATEGORY_ICONS.findIndex((icon) => icon.key === value);

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const step =
      event.key === "ArrowRight" || event.key === "ArrowDown"
        ? 1
        : event.key === "ArrowLeft" || event.key === "ArrowUp"
          ? -1
          : 0;
    if (!step) return;
    event.preventDefault();
    const next = (index + step + CATEGORY_ICONS.length) % CATEGORY_ICONS.length;
    onChange(CATEGORY_ICONS[next].key);
    refs.current[next]?.focus();
  }

  return (
    <div
      id={id}
      role="radiogroup"
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      aria-invalid={invalid || undefined}
      data-testid="category-icon-grid"
      className="grid grid-cols-6 gap-2"
    >
      {CATEGORY_ICONS.map((icon, index) => {
        const checked = icon.key === value;
        const tabbable = selectedIndex === -1 ? index === 0 : checked;
        return (
          <button
            key={icon.key}
            ref={(el) => {
              refs.current[index] = el;
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            aria-label={icon.label}
            title={icon.label}
            data-state={checked ? "checked" : "unchecked"}
            data-testid={`category-icon-option-${icon.key}`}
            tabIndex={tabbable ? 0 : -1}
            disabled={disabled}
            onClick={() => onChange(icon.key)}
            onKeyDown={(event) => onKeyDown(event, index)}
            className={cn(
              "flex aspect-square items-center justify-center rounded-xl border bg-background text-muted-foreground transition-colors outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50",
              checked &&
                "border-primary bg-primary/10 text-foreground ring-1 ring-primary hover:bg-primary/10",
              invalid && !checked && "border-destructive/50",
            )}
          >
            <CategoryIcon icon={icon.key} />
          </button>
        );
      })}
    </div>
  );
}
