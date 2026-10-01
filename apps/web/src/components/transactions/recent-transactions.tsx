import Link from "next/link";

import { CategoryIcon } from "~/components/categories/category-icon";
import { formatDateOnly } from "~/lib/date";
import type { RecentTransaction } from "~/modules/transactions/queries";
import { homeDetailHref } from "~/modules/transactions/schema";

import { TransactionAmount } from "./transaction-amount";

const SHORT_DATE = new Intl.DateTimeFormat("id-ID", {
  timeZone: "UTC",
  day: "numeric",
  month: "short",
});

type RecentTransactionsProps = {
  transactions: readonly RecentTransaction[];
  title?: string;
};

/**
 * Daftar transaksi terbaru (versi minimal E02-US01). Tap baris membuka detail
 * (E02-US04, `?from=home` → tutup kembali ke Beranda). Diperluas oleh
 * E04-US01 (dashboard).
 */
export function RecentTransactions({
  transactions,
  title = "Transaksi terbaru",
}: RecentTransactionsProps) {
  return (
    <section aria-labelledby="recent-transactions-title" className="mt-6">
      <h2
        id="recent-transactions-title"
        className="mb-2 text-sm font-medium text-muted-foreground"
      >
        {title}
      </h2>
      {transactions.length === 0 ? (
        <p
          data-testid="recent-transactions-empty"
          className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground"
        >
          Belum ada transaksi. Tekan tombol + untuk mencatat.
        </p>
      ) : (
        <ul
          data-testid="recent-transactions"
          className="divide-y overflow-hidden rounded-xl border bg-card"
        >
          {transactions.map((transaction) => {
            const date = formatDateOnly(transaction.transactionDate);
            return (
              <li
                key={transaction.id}
                data-testid="recent-transaction-item"
                data-transaction-id={transaction.id}
                data-date={date}
                data-type={transaction.type.toLowerCase()}
              >
                <Link
                  href={homeDetailHref(transaction.id)}
                  data-testid={`transaction-row-${transaction.id}`}
                  className="flex items-center gap-3 px-4 py-3 transition-colors outline-none hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    <CategoryIcon
                      icon={transaction.category.icon}
                      className="size-4"
                    />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p
                      data-testid="transaction-note"
                      className="truncate text-sm font-medium"
                    >
                      {transaction.note ?? transaction.category.name}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      <time data-testid="transaction-date" dateTime={date}>
                        {SHORT_DATE.format(transaction.transactionDate)}
                      </time>
                      {" · "}
                      <span data-testid="transaction-category">
                        {transaction.category.name}
                      </span>
                    </p>
                  </div>
                  <TransactionAmount
                    type={transaction.type}
                    amount={transaction.amount}
                    className="text-sm"
                  />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
