import Link from "next/link";

import { PageHeader } from "~/components/layout/page-header";
import { Button } from "~/components/ui/button";
import { TRANSACTION_LIST_MESSAGES } from "~/modules/transactions/schema";

/** Transaksi tidak ada / milik user lain (tanpa membedakan keduanya). */
export default function TransactionNotFound() {
  return (
    <div data-testid="transaction-not-found">
      <PageHeader title={TRANSACTION_LIST_MESSAGES.notFound} />
      <p className="text-sm text-muted-foreground">
        Transaksi mungkin sudah dihapus atau tautannya salah.
      </p>
      <Button asChild variant="outline" className="mt-4">
        <Link href="/transactions">Kembali ke daftar transaksi</Link>
      </Button>
    </div>
  );
}
