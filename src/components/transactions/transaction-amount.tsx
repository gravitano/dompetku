import { formatRupiah } from "~/lib/format";
import { cn } from "~/lib/utils";
import type { TransactionType } from "~/modules/transactions/schema";

type TransactionAmountProps = {
  type: TransactionType;
  amount: bigint;
  className?: string;
};

/**
 * Nominal di daftar: pengeluaran merah bertanda "−", pemasukan hijau bertanda
 * "+" (design E02-US02).
 */
export function TransactionAmount({
  type,
  amount,
  className,
}: TransactionAmountProps) {
  const income = type === "INCOME";
  return (
    <span
      data-testid="transaction-amount"
      data-type={income ? "income" : "expense"}
      className={cn(
        "font-semibold whitespace-nowrap tabular-nums",
        income ? "text-income" : "text-expense",
        className,
      )}
    >
      <span aria-hidden>{income ? "+ " : "− "}</span>
      <span className="sr-only">{income ? "Pemasukan " : "Pengeluaran "}</span>
      {formatRupiah(amount)}
    </span>
  );
}

type NetAmountProps = {
  value: bigint;
  /** Tampilkan "+" untuk nilai positif (header tanggal). Default: tidak. */
  showPlus?: boolean;
  className?: string;
  "data-testid"?: string;
};

/**
 * Nilai bersih (pemasukan − pengeluaran): negatif "− Rp 43.000" merah,
 * positif hijau ("Rp 7.607.000" atau "+ Rp 7.607.000" bila `showPlus`),
 * nol "Rp 0" netral. `data-value` berisi angka bertanda.
 */
export function NetAmount({
  value,
  showPlus = false,
  className,
  "data-testid": testId,
}: NetAmountProps) {
  const zero = BigInt(0);
  const negative = value < zero;
  const sign = negative ? "− " : showPlus && value > zero ? "+ " : "";
  return (
    <span
      data-testid={testId}
      data-value={value.toString()}
      className={cn(
        "whitespace-nowrap tabular-nums",
        negative ? "text-expense" : value > zero ? "text-income" : "",
        className,
      )}
    >
      {sign}
      {formatRupiah(negative ? -value : value)}
    </span>
  );
}
