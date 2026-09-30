import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Masuk" };

// Placeholder — form login diimplementasikan di story E01-US02.
export default function LoginPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1
        data-testid="login-title"
        className="text-center text-2xl font-semibold"
      >
        Masuk
      </h1>
      <p className="text-center text-sm text-muted-foreground">
        Belum punya akun?{" "}
        <Link
          href="/register"
          data-testid="login-register-link"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          Daftar
        </Link>
      </p>
    </div>
  );
}
