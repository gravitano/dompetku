import {
  ChartPie,
  House,
  ArrowLeftRight,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export type NavKey = "home" | "transactions" | "budgets" | "reports";

export type NavItem = {
  key: NavKey;
  href: "/" | "/transactions" | "/budgets" | "/reports";
  label: string;
  icon: LucideIcon;
};

/** Menu utama — dipakai bottom nav (HP) dan sidebar (desktop). */
export const NAV_ITEMS: readonly NavItem[] = [
  { key: "home", href: "/", label: "Beranda", icon: House },
  {
    key: "transactions",
    href: "/transactions",
    label: "Transaksi",
    icon: ArrowLeftRight,
  },
  { key: "budgets", href: "/budgets", label: "Anggaran", icon: Wallet },
  { key: "reports", href: "/reports", label: "Laporan", icon: ChartPie },
];

export function isNavActive(pathname: string, href: NavItem["href"]) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
