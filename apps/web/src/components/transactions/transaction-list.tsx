"use client";

import { CircleAlertIcon, LoaderCircleIcon } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { CategoryIcon } from "~/components/categories/category-icon";
import { Button } from "~/components/ui/button";
import { loadTransactionPageAction } from "~/modules/transactions/actions";
import {
  appendTransactionPage,
  groupTransactionsByDate,
  type TransactionListItem,
  type TransactionListPage,
} from "~/modules/transactions/list";
import {
  TRANSACTION_LIST_MESSAGES as M,
  transactionDetailHref,
  type TransactionListFilter,
} from "~/modules/transactions/schema";

import { NetAmount, TransactionAmount } from "./transaction-amount";

type TransactionListProps = {
  filter: TransactionListFilter;
  /** "YYYY-MM" bulan berjalan — untuk tautan detail yang membawa filter. */
  currentMonth: string;
  /** Halaman pertama dari server (RSC); halaman berikutnya via Server Action. */
  firstPage: TransactionListPage;
};

type ListState = {
  /** Halaman pertama asal state ini; berubah → state di-reset. */
  base: TransactionListPage;
  page: TransactionListPage;
  status: "idle" | "loading" | "error";
};

function TransactionRow({
  transaction,
  href,
}: {
  transaction: TransactionListItem;
  href: string;
}) {
  const { category } = transaction;
  return (
    <li>
      <Link
        href={href}
        data-testid={`transaction-row-${transaction.id}`}
        data-transaction-id={transaction.id}
        data-date={transaction.date}
        data-type={transaction.type.toLowerCase()}
        className="flex items-center gap-3 px-4 py-3 transition-colors outline-none hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset"
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <CategoryIcon icon={category.icon} className="size-4" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span
            data-testid="transaction-note"
            className="truncate text-sm font-medium"
          >
            {transaction.note ?? category.name}
          </span>
          <span
            data-testid="transaction-category"
            className="truncate text-xs text-muted-foreground"
          >
            {category.name}
            {category.archived ? " · Diarsipkan" : null}
          </span>
        </span>
        <TransactionAmount
          type={transaction.type}
          amount={transaction.amount}
          className="text-sm"
        />
      </Link>
    </li>
  );
}

/**
 * Daftar transaksi per tanggal (E02-US03 AC 1–2, 9–10): header tanggal +
 * total bersih harian, infinite scroll 50 per halaman, error memuat dengan
 * "Coba lagi" (data yang sudah tampil tetap ada). Tap baris → detail.
 */
export function TransactionList({
  filter,
  currentMonth,
  firstPage,
}: TransactionListProps) {
  const [state, setState] = useState<ListState>({
    base: firstPage,
    page: firstPage,
    status: "idle",
  });
  // Halaman pertama baru (ganti bulan/filter, atau refresh setelah mutasi) →
  // mulai ulang dari halaman pertama tsb.
  if (state.base !== firstPage) {
    setState({ base: firstPage, page: firstPage, status: "idle" });
  }

  const { page, status } = state;
  const loadingRef = useRef(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const loadMore = useCallback(async () => {
    const cursor = state.page.nextCursor;
    if (loadingRef.current || !cursor) return;
    loadingRef.current = true;
    const base = state.base;
    setState((s) => (s.base === base ? { ...s, status: "loading" } : s));

    let next: TransactionListPage | null = null;
    try {
      const result = await loadTransactionPageAction({ filter, cursor });
      if (result.success) next = result.data;
    } catch {
      // Koneksi terputus / server error → tampilkan error + Coba lagi.
    }
    loadingRef.current = false;
    setState((s) => {
      if (s.base !== base) return s;
      return next
        ? { ...s, page: appendTransactionPage(s.page, next), status: "idle" }
        : { ...s, status: "error" };
    });
  }, [filter, state.base, state.page.nextCursor]);

  const hasMore = page.nextCursor !== null;

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore || status !== "idle") return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) void loadMore();
      },
      { rootMargin: "200px 0px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, status, loadMore, page.items.length]);

  const groups = groupTransactionsByDate(page.items, page.dayTotals);

  return (
    <div
      data-testid="transaction-list"
      data-count={page.items.length}
      className="mt-4 flex flex-col gap-4"
    >
      {groups.map((group) => (
        <section
          key={group.date}
          data-testid={`transaction-group-${group.date}`}
          data-date={group.date}
          aria-labelledby={`transaction-group-label-${group.date}`}
          className="flex flex-col gap-1.5"
        >
          <div className="flex items-center justify-between gap-2 px-1">
            <h2
              id={`transaction-group-label-${group.date}`}
              data-testid="transaction-group-label"
              className="text-sm font-medium text-muted-foreground"
            >
              {group.label}
            </h2>
            <NetAmount
              value={group.net}
              showPlus
              data-testid="transaction-group-total"
              className="text-sm font-medium"
            />
          </div>
          <ul className="divide-y overflow-hidden rounded-xl border bg-card">
            {group.items.map((transaction) => (
              <TransactionRow
                key={transaction.id}
                transaction={transaction}
                href={transactionDetailHref(
                  transaction.id,
                  filter,
                  currentMonth,
                )}
              />
            ))}
          </ul>
        </section>
      ))}

      <div ref={sentinelRef} data-testid="transaction-list-sentinel" />

      {status === "loading" ? (
        <p
          data-testid="transaction-list-loading"
          role="status"
          className="flex items-center justify-center gap-2 py-2 text-sm text-muted-foreground"
        >
          <LoaderCircleIcon className="size-4 animate-spin" aria-hidden />
          Memuat transaksi...
        </p>
      ) : null}

      {status === "error" ? (
        <div
          role="alert"
          data-testid="transaction-list-error"
          className="flex flex-col items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-3 text-sm text-destructive"
        >
          <span className="flex items-center gap-2">
            <CircleAlertIcon className="size-4 shrink-0" aria-hidden />
            {M.loadError}
          </span>
          <Button
            variant="outline"
            size="sm"
            data-testid="transaction-list-retry-button"
            onClick={() => void loadMore()}
          >
            {M.retry}
          </Button>
        </div>
      ) : null}

      {!hasMore && page.items.length > 0 ? (
        <p
          data-testid="transaction-list-end"
          className="py-2 text-center text-xs text-muted-foreground"
        >
          {M.end}
        </p>
      ) : null}
    </div>
  );
}
