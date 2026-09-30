import type { Metadata } from "next";

import { PageHeader } from "~/components/layout/page-header";

export const metadata: Metadata = { title: "Transaksi" };

export default function Page() {
  return (
    <PageHeader
      title="Transaksi"
      description="Daftar transaksi akan tampil di sini (E02-US03)."
    />
  );
}
