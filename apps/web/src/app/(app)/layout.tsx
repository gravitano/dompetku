import { Suspense } from "react";

import { WelcomeToast } from "~/components/auth/welcome-toast";
import { AccountMenu } from "~/components/layout/account-menu";
import { AppShell } from "~/components/layout/app-shell";
import { BfcacheGuard } from "~/components/layout/bfcache-guard";
import { requireUserOrRedirect } from "~/lib/session";

// Area login: semua route di grup (app) butuh session.
// `src/proxy.ts` melakukan pengecekan cookie (optimistic); di sini session
// divalidasi ke database (defense in depth, ITA §6.1). Layout ini membaca
// session per request sehingga halaman selalu dinamis (`Cache-Control:
// no-store`) — tombol back setelah logout selalu meminta ulang ke server.
export default async function AppLayout({ children, modal }: LayoutProps<"/">) {
  const user = await requireUserOrRedirect();

  return (
    <AppShell accountMenu={<AccountMenu name={user.name} email={user.email} />}>
      {children}
      {/* Detail transaksi sebagai modal (intercepting route, E02-US04). */}
      {modal}
      <BfcacheGuard />
      <Suspense fallback={null}>
        <WelcomeToast name={user.name} />
      </Suspense>
    </AppShell>
  );
}
