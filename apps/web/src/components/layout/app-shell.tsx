import type { ReactNode } from "react";

import { AppHeader } from "./app-header";
import { AppSidebar } from "./app-sidebar";
import { BottomNav } from "./bottom-nav";

type AppShellProps = {
  children: ReactNode;
  accountMenu?: ReactNode;
};

/** Kerangka area login: header + sidebar (desktop) + bottom nav (HP). */
export function AppShell({ children, accountMenu }: AppShellProps) {
  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader accountMenu={accountMenu} />
      <div className="flex flex-1">
        <AppSidebar />
        <main
          data-testid="app-main"
          className="mx-auto w-full max-w-3xl flex-1 px-4 pt-4 pb-24 md:pb-8"
        >
          {children}
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
