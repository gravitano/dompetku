import type { Metadata } from "next";

export const metadata: Metadata = { title: "Masuk" };

// Placeholder — form login diimplementasikan di story E01-US02.
export default function LoginPage() {
  return (
    <h1
      data-testid="login-title"
      className="text-center text-2xl font-semibold"
    >
      Masuk
    </h1>
  );
}
