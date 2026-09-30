import Link from "next/link";
import type { ReactNode } from "react";

type AppHeaderProps = {
  /** Slot kanan atas — menu akun (diisi story E01-US02: logout, kategori, dll). */
  accountMenu?: ReactNode;
};

export function AppHeader({ accountMenu }: AppHeaderProps) {
  return (
    <header
      data-testid="app-header"
      className="sticky top-0 z-40 flex h-14 items-center justify-between border-b bg-background/95 px-4 backdrop-blur"
    >
      <Link
        href="/"
        data-testid="app-logo"
        className="text-lg font-semibold tracking-tight"
      >
        DompetKu
      </Link>
      <div data-testid="app-header-actions" className="flex items-center gap-2">
        {accountMenu}
      </div>
    </header>
  );
}
