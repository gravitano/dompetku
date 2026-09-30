import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { RegisterForm } from "~/components/auth/register-form";
import { getSessionUser } from "~/lib/session";

export const metadata: Metadata = { title: "Daftar" };

export default async function RegisterPage() {
  // AC 12: user yang sudah login langsung ke Beranda.
  const user = await getSessionUser();
  if (user) redirect("/");

  return (
    <div className="md:rounded-xl md:bg-card md:p-6 md:ring-1 md:ring-foreground/10">
      <div className="mb-6">
        <h1
          data-testid="register-title"
          className="text-2xl font-semibold tracking-tight"
        >
          Buat Akun
        </h1>
        <p className="text-sm text-muted-foreground">
          Catat keuanganmu dalam hitungan detik.
        </p>
      </div>
      <RegisterForm />
    </div>
  );
}
