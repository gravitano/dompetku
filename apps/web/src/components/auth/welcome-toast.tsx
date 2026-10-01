"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

type WelcomeToastProps = {
  name: string;
};

/** Query param yang dipasang `registerAction` setelah registrasi berhasil. */
export const WELCOME_PARAM = "welcome";

/**
 * Tampilkan toast "Selamat datang, <nama>!" sekali setelah registrasi
 * (E01-US01 AC 8), lalu hapus `?welcome=1` dari URL.
 */
export function WelcomeToast({ name }: WelcomeToastProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const shown = useRef(false);
  const welcome = searchParams.get(WELCOME_PARAM) === "1";

  useEffect(() => {
    if (!welcome || shown.current) return;
    shown.current = true;
    toast.success(`Selamat datang, ${name}!`, { id: "welcome" });

    const params = new URLSearchParams(searchParams.toString());
    params.delete(WELCOME_PARAM);
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, {
      scroll: false,
    });
  }, [welcome, name, pathname, router, searchParams]);

  return null;
}
