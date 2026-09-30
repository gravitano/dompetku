import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";

import { CategoryIcon } from "~/components/categories/category-icon";
import { PageHeader } from "~/components/layout/page-header";
import { BackToListLink } from "~/components/transactions/back-to-list-link";
import { TransactionAmount } from "~/components/transactions/transaction-amount";
import { Badge } from "~/components/ui/badge";
import {
  formatDate,
  formatDayLabel,
  parseDateOnly,
  toJakartaDateString,
} from "~/lib/date";
import { requireUserOrRedirect } from "~/lib/session";
import { getTransactionDetail } from "~/modules/transactions/queries";
import { transactionListHref } from "~/modules/transactions/schema";

export const metadata: Metadata = { title: "Detail Transaksi" };

const RECORDED_TIME = new Intl.DateTimeFormat("id-ID", {
  timeZone: "Asia/Jakarta",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/**
 * Detail transaksi (tujuan tap baris daftar, E02-US03 AC 10) — versi
 * read-only. Form ubah & hapus menyusul di E02-US04 dengan tautan yang sama.
 * Transaksi milik user lain / id tidak valid → "Transaksi tidak ditemukan".
 */
export default async function Page({
  params,
}: PageProps<"/transactions/[id]">) {
  const user = await requireUserOrRedirect();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();

  const transaction = await getTransactionDetail(user.id, id);
  if (!transaction) notFound();

  const date = parseDateOnly(transaction.date);
  const recordedAt = new Date(transaction.createdAt);
  const rows = [
    {
      key: "type",
      label: "Jenis",
      value: transaction.type === "INCOME" ? "Pemasukan" : "Pengeluaran",
    },
    {
      key: "category",
      label: "Kategori",
      value: (
        <span className="flex items-center gap-2">
          <CategoryIcon
            icon={transaction.category.icon}
            className="size-4 text-muted-foreground"
          />
          {transaction.category.name}
          {transaction.category.archived ? (
            <Badge variant="secondary">Diarsipkan</Badge>
          ) : null}
        </span>
      ),
    },
    { key: "date", label: "Tanggal", value: formatDayLabel(date) },
    { key: "note", label: "Catatan", value: transaction.note ?? "—" },
  ];

  return (
    <div data-testid="transaction-detail" className="flex flex-col gap-4">
      <BackToListLink
        fallbackHref={transactionListHref({
          month: transaction.date.slice(0, 7),
        })}
      />
      <PageHeader title="Detail Transaksi" />
      <div className="rounded-xl border bg-card p-4">
        <TransactionAmount
          type={transaction.type}
          amount={transaction.amount}
          className="text-2xl"
        />
        <dl className="mt-4 divide-y text-sm">
          {rows.map((row) => (
            <div
              key={row.key}
              data-testid={`transaction-detail-${row.key}`}
              className="flex items-center justify-between gap-4 py-2.5"
            >
              <dt className="text-muted-foreground">{row.label}</dt>
              <dd className="text-right font-medium">{row.value}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-xs text-muted-foreground">
          Dicatat {formatDate(parseDateOnly(toJakartaDateString(recordedAt)))},{" "}
          {RECORDED_TIME.format(recordedAt)}
        </p>
      </div>
    </div>
  );
}
