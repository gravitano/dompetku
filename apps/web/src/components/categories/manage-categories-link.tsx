import Link from "next/link";

import { cn } from "~/lib/utils";

type ManageCategoriesLinkProps = {
  /** Halaman Kategori (E02-US05), mis. `categoriesHref("INCOME")`. */
  href: string;
  className?: string;
};

/** Tautan "Kelola kategori" di empty state grid kategori (E02-US02). */
export function ManageCategoriesLink({
  href,
  className,
}: ManageCategoriesLinkProps) {
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
