import type { Metadata } from "next";

import { PageHeader } from "~/components/layout/page-header";

export const metadata: Metadata = { title: "Anggaran" };

export default function Page() {
  return (
    <PageHeader
      title="Anggaran"
      description="Anggaran per kategori akan tampil di sini (E03-US01)."
    />
  );
}
