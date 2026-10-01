import { ChevronRightIcon } from "lucide-react";
import Link from "next/link";

import { CategoryIcon } from "~/components/categories/category-icon";
import { formatPercentTenths, formatRupiah } from "~/lib/format";
import { cn } from "~/lib/utils";
import {
  REPORT_MESSAGES as M,
  type CategoryBreakdownItem,
} from "~/modules/reports/view";

/** "12,5%"; nominal > 0 yang dibulatkan ke 0,0% → "< 0,1%". */
export function percentLabel(tenths: number): string {
  return tenths === 0 ? "< 0,1%" : formatPercentTenths(tenths);
}

/**
 * Daftar kategori di bawah/samping donut (E04-US02 AC 4, 9, UX-03): selalu
 * tampil sebagai teks — titik warna (sama dengan irisan), ikon, nama (+ label
 * "(diarsipkan)"), persentase, dan nominal lengkap — urut terbesar. Tap baris
 * → daftar transaksi terfilter kategori + bulan (E02-US03).
 */
export function CategoryBreakdownList({
  items,
  className,
}: {
  items: readonly CategoryBreakdownItem[];
  className?: string;
}) {
  return (
    <ul
      data-testid="category-breakdown"
      aria-label="Pengeluaran per kategori"
      className={cn("flex flex-col divide-y", className)}
    >
      {items.map((item) => (
        <li key={item.categoryId}>
          <Link
            href={item.href}
            data-testid="category-breakdown-item"
            data-category={item.key}
            data-amount={item.amount}
            data-percent={item.percentTenths}
            className="-mx-2 flex min-h-12 items-center gap-3 rounded-lg px-2 py-2 transition-colors outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <span
              aria-hidden
              data-testid="category-breakdown-color"
              className="size-3 shrink-0 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <CategoryIcon icon={item.icon} className="size-4" />
            </span>
            <span className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-1.5">
              <span
                data-testid="category-breakdown-name"
                className="font-medium break-words"
              >
                {item.name}
              </span>
              {item.archived ? (
                <span
                  data-testid="category-breakdown-archived"
                  className="text-xs text-muted-foreground"
                >
                  {M.archived}
                </span>
              ) : null}
            </span>
            <span
              data-testid="category-breakdown-percent"
              className="shrink-0 text-sm text-muted-foreground tabular-nums"
            >
              {percentLabel(item.percentTenths)}
            </span>
            <span
              data-testid="category-breakdown-amount"
              className="shrink-0 text-right font-semibold tabular-nums"
            >
              {formatRupiah(BigInt(item.amount))}
            </span>
            <ChevronRightIcon
              className="size-4 shrink-0 text-muted-foreground"
              aria-hidden
            />
            <span className="sr-only">, lihat transaksi</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
