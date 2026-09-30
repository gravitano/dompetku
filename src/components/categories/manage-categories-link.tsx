import Link from "next/link";

import { cn } from "~/lib/utils";

type ManageCategoriesLinkProps = {
  /**
   * Tujuan halaman Kategori. Kosong selama halaman Kategori (E02-US05) belum
   * ada: tautan tampil nonaktif dengan keterangan "segera hadir" agar tidak
   * mengarah ke 404 — sama seperti item menu akun "Kategori".
   */
  href?: string;
  className?: string;
};

/** Tautan "Kelola kategori" di empty state grid kategori (E02-US02). */
export function ManageCategoriesLink({
  href,
  className,
}: ManageCategoriesLinkProps) {
  if (href) {
    return (
      <Link
        href={href}
        data-testid="category-manage-link"
        className={cn(
          "font-medium text-primary underline-offset-4 hover:underline",
          className,
        )}
      >
        Kelola kategori
      </Link>
    );
  }
  return (
    <span className={cn("flex flex-col items-center gap-0.5", className)}>
      <span
        role="link"
        aria-disabled="true"
        data-testid="category-manage-link"
        className="cursor-not-allowed font-medium text-muted-foreground"
      >
        Kelola kategori
      </span>
      <span data-testid="category-manage-hint" className="text-xs">
        Segera hadir di menu akun → Kategori
      </span>
    </span>
  );
}
