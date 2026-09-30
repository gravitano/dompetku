"use client";

import {
  ChevronDownIcon,
  LoaderCircleIcon,
  LogOutIcon,
  TagsIcon,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { getInitials } from "~/lib/format";
import { logoutAction } from "~/modules/auth/actions";
import { LOGOUT_PARAM, LOGIN_PATH } from "~/modules/auth/callback-url";
import { LOGIN_MESSAGES } from "~/modules/auth/schema";

type AccountMenuProps = {
  name: string;
  email: string;
};

const LOGOUT_REDIRECT = `${LOGIN_PATH}?${LOGOUT_PARAM}=1`;

/**
 * Menu akun di header kanan atas (E01-US02 UX-06, UX-07): avatar inisial +
 * nama; dropdown berisi nama, email, Kategori (E02-US05), dan Keluar.
 */
export function AccountMenu({ name, email }: AccountMenuProps) {
  const [pending, setPending] = useState(false);

  async function logout() {
    if (pending) return;
    setPending(true);
    try {
      const result = await logoutAction();
      if (!result.success) throw new Error(result.error.message);
    } catch {
      setPending(false);
      toast.error(LOGIN_MESSAGES.logoutFailed, { id: "logout-error" });
      return;
    }
    // Full page load (bukan router.push) agar router cache client — berisi
    // data halaman sebelumnya — ikut terbuang (AC 11).
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- sengaja full page load
    window.location.assign(LOGOUT_REDIRECT);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          data-testid="account-menu"
          aria-label={`Menu akun ${name}`}
          className="h-9 gap-2 rounded-full pr-2 pl-1"
          disabled={pending}
        >
          <span
            aria-hidden
            className="flex size-7 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground"
          >
            {getInitials(name)}
          </span>
          <span
            data-testid="account-menu-name"
            className="max-w-32 truncate text-sm font-medium"
          >
            {name}
          </span>
          {pending ? (
            <LoaderCircleIcon className="animate-spin" aria-hidden />
          ) : (
            <ChevronDownIcon className="text-muted-foreground" aria-hidden />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-60"
        data-testid="account-menu-content"
      >
        <DropdownMenuLabel className="flex flex-col gap-0.5 px-2 py-1.5">
          <span
            data-testid="account-menu-user-name"
            className="truncate text-sm font-medium text-foreground"
          >
            {name}
          </span>
          <span
            data-testid="account-menu-email"
            className="truncate text-xs font-normal text-muted-foreground"
          >
            {email}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {/* Kelola kategori (E02-US05 UX-01). */}
        <DropdownMenuItem asChild>
          <Link href="/categories" data-testid="account-menu-categories">
            <TagsIcon aria-hidden />
            Kategori
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          data-testid="account-menu-logout"
          onSelect={() => void logout()}
        >
          <LogOutIcon aria-hidden />
          Keluar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
