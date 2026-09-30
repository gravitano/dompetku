import { Button } from "~/components/ui/button";

type AccountMenuPlaceholderProps = {
  name: string;
};

/**
 * Placeholder menu akun (kanan atas). Story E01-US02 menggantinya dengan
 * dropdown `account-menu` (Kelola kategori, Keluar).
 */
export function AccountMenuPlaceholder({ name }: AccountMenuPlaceholderProps) {
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  return (
    <Button
      variant="outline"
      size="icon"
      className="rounded-full"
      data-testid="account-menu-button"
      aria-label={`Menu akun ${name}`}
    >
      {initial}
    </Button>
  );
}
