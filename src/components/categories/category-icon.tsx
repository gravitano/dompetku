import {
  BabyIcon,
  BriefcaseIcon,
  BusIcon,
  CarIcon,
  ClapperboardIcon,
  CoffeeIcon,
  DumbbellIcon,
  Gamepad2Icon,
  GiftIcon,
  GraduationCapIcon,
  HeartPulseIcon,
  HouseIcon,
  PackageIcon,
  PartyPopperIcon,
  PawPrintIcon,
  PiggyBankIcon,
  PlaneIcon,
  ReceiptIcon,
  ShirtIcon,
  ShoppingCartIcon,
  SmartphoneIcon,
  TagIcon,
  UtensilsIcon,
  WalletIcon,
  ZapIcon,
  type LucideIcon,
} from "lucide-react";

import { cn } from "~/lib/utils";
import type { CategoryIconKey } from "~/modules/categories/icons";

/** Kunci di kolom `categories.icon` (lihat `~/modules/categories/icons`). */
const ICONS: Record<CategoryIconKey, LucideIcon> = {
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
  coffee: CoffeeIcon,
  car: CarIcon,
  house: HouseIcon,
  shirt: ShirtIcon,
  "graduation-cap": GraduationCapIcon,
  baby: BabyIcon,
  "paw-print": PawPrintIcon,
  plane: PlaneIcon,
  smartphone: SmartphoneIcon,
  zap: ZapIcon,
  gamepad: Gamepad2Icon,
  dumbbell: DumbbellIcon,
  "piggy-bank": PiggyBankIcon,
  briefcase: BriefcaseIcon,
};

type CategoryIconProps = {
  icon: string | null;
  className?: string;
};

/** Ikon kategori; ikon tidak dikenal → ikon label (Tag). */
export function CategoryIcon({ icon, className }: CategoryIconProps) {
  const Icon = (icon && ICONS[icon as CategoryIconKey]) || TagIcon;
  return <Icon className={cn("size-5", className)} aria-hidden />;
}
