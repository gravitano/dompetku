import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { LoginForm, type LoginNotice } from "~/components/auth/login-form";
import { getSessionUser } from "~/lib/session";
import {
  CALLBACK_URL_PARAM,
  LOGOUT_PARAM,
  REGISTERED_PARAM,
  sanitizeCallbackUrl,
} from "~/modules/auth/callback-url";

export const metadata: Metadata = { title: "Masuk" };

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const callbackUrl = sanitizeCallbackUrl(
    firstParam(params[CALLBACK_URL_PARAM]),
  );

  // AC 8: user yang sudah login langsung ke Beranda (atau halaman tujuan).
  const user = await getSessionUser();
  if (user) redirect(callbackUrl);

  let notice: LoginNotice | null = null;
  if (firstParam(params[LOGOUT_PARAM]) === "1") notice = "logout";
  else if (firstParam(params[REGISTERED_PARAM]) === "1") notice = "registered";

  return (
    <div className="md:rounded-xl md:bg-card md:p-6 md:ring-1 md:ring-foreground/10">
      <div className="mb-6">
        <h1
          data-testid="login-title"
          className="text-2xl font-semibold tracking-tight"
        >
          Masuk
        </h1>
        <p className="text-sm text-muted-foreground">Selamat datang kembali.</p>
      </div>
      <LoginForm callbackUrl={callbackUrl} notice={notice} />
    </div>
  );
}
