"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "~/lib/utils";

import { NAV_ITEMS, isNavActive } from "./nav-items";

/** Sidebar kiri — hanya tampil di desktop (>= md). Menu sama dengan bottom nav. */
export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside
      data-testid="sidebar-nav"
      className="hidden w-60 shrink-0 border-r bg-sidebar md:block"
    >
      <nav aria-label="Navigasi utama" className="sticky top-14 p-3">
        <ul className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => {
            const active = isNavActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <li key={item.key}>
                <Link
                  href={item.href}
                  data-testid={`sidebar-nav-${item.key}`}
                  data-active={active}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground transition-colors hover:bg-sidebar-accent",
                    active &&
                      "bg-sidebar-accent font-medium text-sidebar-accent-foreground",
                  )}
                >
                  <Icon className="size-4" aria-hidden />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
