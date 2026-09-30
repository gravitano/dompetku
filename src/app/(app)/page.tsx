import type { Metadata } from "next";

import { PageHeader } from "~/components/layout/page-header";

export const metadata: Metadata = { title: "Beranda" };

export default function Page() {
  return (
    <PageHeader
      title="Beranda"
      description="Ringkasan bulan berjalan akan tampil di sini (E04-US01)."
    />
  );
}
