"use client";

import { useLayoutEffect, useRef, type ComponentProps, type Ref } from "react";

import { Input } from "~/components/ui/input";
import { formatAmountInput, parseAmountInput } from "~/lib/format";

type AmountInputProps = Omit<
  ComponentProps<"input">,
  "value" | "onChange" | "type" | "ref"
> & {
  /** Nilai sebagai string digit ("25000"), "" bila kosong. */
  value: string;
  onValueChange: (digits: string) => void;
  ref?: Ref<HTMLInputElement>;
};

function countDigits(text: string): number {
  return text.replace(/\D/g, "").length;
}

/** Posisi di `text` tepat setelah digit ke-`count` (0 → setelah prefix "Rp "). */
function caretAfterDigits(text: string, count: number): number {
  if (count === 0) return text.startsWith("Rp ") ? 3 : 0;
  let seen = 0;
  for (let i = 0; i < text.length; i++) {
    if (/\d/.test(text[i]) && ++seen === count) return i + 1;
  }
  return text.length;
}

/**
 * Input nominal Rupiah (E02-US01 UX-01): keyboard numerik di HP, tampilan
 * otomatis `Rp 25.000` saat mengetik, kursor tetap di posisi digit yang sama.
 */
export function AmountInput({
  value,
  onValueChange,
  ref,
  ...props
}: AmountInputProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  /** Jumlah digit di kiri kursor setelah perubahan terakhir. */
  const pendingCaret = useRef<number | null>(null);
  const display = formatAmountInput(value);

  useLayoutEffect(() => {
    const input = inputRef.current;
    const digitsBefore = pendingCaret.current;
    if (!input || digitsBefore === null) return;
    pendingCaret.current = null;
    if (document.activeElement !== input) return;
    const position = caretAfterDigits(input.value, digitsBefore);
    input.setSelectionRange(position, position);
  });

  return (
    <Input
      {...props}
      ref={(el) => {
        inputRef.current = el;
        if (typeof ref === "function") ref(el);
        else if (ref) ref.current = el;
      }}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      placeholder="Rp 0"
      value={display}
      onChange={(event) => {
        const input = event.target;
        const caret = input.selectionStart ?? input.value.length;
        const rawDigits = input.value.replace(/\D/g, "");
        let digitsBefore = countDigits(input.value.slice(0, caret));
        let next = parseAmountInput(input.value);

        if (
          next === value &&
          input.value.length < display.length &&
          digitsBefore > 0
        ) {
          // Backspace pada pemisah ribuan ("Rp 25.|000") → hapus digit di kirinya.
          next = parseAmountInput(
            value.slice(0, digitsBefore - 1) + value.slice(digitsBefore),
          );
          digitsBefore -= 1;
        } else {
          // Nol di depan dibuang ("0|5" → "5"): geser kursor sebanyak itu.
          digitsBefore -=
            rawDigits.length - rawDigits.replace(/^0+(?=\d)/, "").length;
        }
        digitsBefore = Math.max(0, Math.min(next.length, digitsBefore));

        pendingCaret.current = digitsBefore;
        onValueChange(next);
      }}
    />
  );
}
