import { ChevronRightIcon } from "lucide-react";
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
  /** Tidak kosong — empty state ditangani pemanggil (Beranda E04-US01). */
  transactions: readonly RecentTransaction[];
  title?: string;
  /** Tujuan link "Lihat semua" di judul bagian (tab Transaksi, UX-03). */
  seeAllHref?: string;
};

/**
 * Daftar transaksi terbaru di Beranda (E04-US01 AC 6–7, UX-03/UX-04): ikon
 * kategori, catatan (atau nama kategori), tanggal, nominal bertanda. Tap baris
 * membuka detail (E02-US04, `?from=home` → tutup kembali ke Beranda).
 */
export function RecentTransactions({
  transactions,
  title = "Transaksi terbaru",
  seeAllHref,
}: RecentTransactionsProps) {
  return (
    <section aria-labelledby="recent-transactions-title" className="mt-6">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h2
          id="recent-transactions-title"
          className="text-sm font-medium text-muted-foreground"
        >
          {title}
        </h2>
        {seeAllHref ? (
          <Link
            href={seeAllHref}
            data-testid="recent-transactions-see-all"
            className="flex shrink-0 items-center gap-0.5 rounded-sm text-sm font-medium text-primary outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            Lihat semua
            <span className="sr-only"> transaksi</span>
            <ChevronRightIcon className="size-4" aria-hidden />
          </Link>
        ) : null}
      </div>
      {transactions.length === 0 ? null : (
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
