"use client";

import { ArrowLeftIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "~/components/ui/button";

/**
 * Kembali ke daftar transaksi: memakai riwayat browser bila ada (bulan &
 * filter daftar tetap), selain itu ke `fallbackHref`.
 */
export function BackToListLink({ fallbackHref }: { fallbackHref: string }) {
  const router = useRouter();
  return (
    <Button asChild variant="ghost" size="sm" className="-ml-2 w-fit">
      <Link
        href={fallbackHref}
        data-testid="transaction-detail-back"
        onClick={(event) => {
          if (window.history.length > 1) {
            event.preventDefault();
            router.back();
          }
        }}
      >
        <ArrowLeftIcon aria-hidden />
        Kembali
      </Link>
    </Button>
  );
}
