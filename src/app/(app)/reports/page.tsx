import type { Metadata } from "next";

import { PageHeader } from "~/components/layout/page-header";

export const metadata: Metadata = { title: "Laporan" };

export default function Page() {
  return (
    <PageHeader
      title="Laporan"
      description="Grafik laporan akan tampil di sini (E04-US02, E04-US03)."
    />
  );
}
