/**
 * Daftar ikon kategori (E02-US05 UX-09). Isomorfik: kunci disimpan di kolom
 * `categories.icon` dan divalidasi schema; komponen `CategoryIcon`
 * (`~/components/categories/category-icon`) memetakan kunci → ikon lucide.
 * 10 ikon pertama dipakai kategori bawaan (`./defaults`).
 */
export const CATEGORY_ICONS = [
  { key: "utensils", label: "Makan" },
  { key: "bus", label: "Bus" },
  { key: "shopping-cart", label: "Belanja" },
  { key: "receipt", label: "Tagihan" },
  { key: "clapperboard", label: "Hiburan" },
  { key: "heart-pulse", label: "Kesehatan" },
  { key: "package", label: "Paket" },
  { key: "wallet", label: "Dompet" },
  { key: "gift", label: "Hadiah" },
  { key: "party-popper", label: "Perayaan" },
  { key: "coffee", label: "Kopi" },
  { key: "car", label: "Mobil" },
  { key: "house", label: "Rumah" },
  { key: "shirt", label: "Pakaian" },
  { key: "graduation-cap", label: "Pendidikan" },
  { key: "baby", label: "Anak" },
  { key: "paw-print", label: "Hewan peliharaan" },
  { key: "plane", label: "Liburan" },
  { key: "smartphone", label: "Pulsa & internet" },
  { key: "zap", label: "Listrik" },
  { key: "gamepad", label: "Game" },
  { key: "dumbbell", label: "Olahraga" },
  { key: "piggy-bank", label: "Tabungan" },
  { key: "briefcase", label: "Pekerjaan" },
] as const;

export type CategoryIconKey = (typeof CATEGORY_ICONS)[number]["key"];

export const CATEGORY_ICON_KEYS = CATEGORY_ICONS.map((icon) => icon.key) as [
  CategoryIconKey,
  ...CategoryIconKey[],
];

export function isCategoryIconKey(value: unknown): value is CategoryIconKey {
  return (
    typeof value === "string" &&
    (CATEGORY_ICON_KEYS as readonly string[]).includes(value)
  );
}
