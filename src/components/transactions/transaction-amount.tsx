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
