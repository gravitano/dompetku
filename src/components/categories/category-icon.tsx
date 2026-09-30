import {
  BusIcon,
  ClapperboardIcon,
  GiftIcon,
  HeartPulseIcon,
  PackageIcon,
  PartyPopperIcon,
  ReceiptIcon,
  ShoppingCartIcon,
  TagIcon,
  UtensilsIcon,
  WalletIcon,
  type LucideIcon,
} from "lucide-react";

import { cn } from "~/lib/utils";

/** Nama ikon di kolom `categories.icon` (lihat `~/modules/categories/defaults`). */
const ICONS: Record<string, LucideIcon> = {
  utensils: UtensilsIcon,
  bus: BusIcon,
  "shopping-cart": ShoppingCartIcon,
  receipt: ReceiptIcon,
  clapperboard: ClapperboardIcon,
  "heart-pulse": HeartPulseIcon,
  package: PackageIcon,
  wallet: WalletIcon,
  gift: GiftIcon,
  "party-popper": PartyPopperIcon,
};

type CategoryIconProps = {
  icon: string | null;
  className?: string;
};

/** Ikon kategori; ikon tidak dikenal → ikon label (Tag). */
export function CategoryIcon({ icon, className }: CategoryIconProps) {
  const Icon = (icon && ICONS[icon]) || TagIcon;
  return <Icon className={cn("size-5", className)} aria-hidden />;
}
