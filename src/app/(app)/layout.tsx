import { Suspense } from "react";

import { WelcomeToast } from "~/components/auth/welcome-toast";
import { AccountMenuPlaceholder } from "~/components/layout/account-menu-placeholder";
import { AppShell } from "~/components/layout/app-shell";
import { requireUserOrRedirect } from "~/lib/session";

// Area login: semua route di grup (app) butuh session.
// `src/proxy.ts` melakukan pengecekan cookie (optimistic); di sini session
// divalidasi ke database (defense in depth, ITA §6.1).
export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await requireUserOrRedirect();

  return (
    <AppShell accountMenu={<AccountMenuPlaceholder name={user.name} />}>
      {children}
      <Suspense fallback={null}>
        <WelcomeToast name={user.name} />
      </Suspense>
    </AppShell>
  );
}
