"use client";

import { useEffect } from "react";

/**
 * Muat ulang halaman area login bila dipulihkan dari back-forward cache
 * browser (mis. tombol *back* setelah logout), sehingga session dicek ulang
 * di server dan data keuangan tidak tampil tanpa login (E01-US02 AC 11).
 */
export function BfcacheGuard() {
  useEffect(() => {
    function onPageShow(event: PageTransitionEvent) {
      if (event.persisted) window.location.reload();
    }
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);
  return null;
}
