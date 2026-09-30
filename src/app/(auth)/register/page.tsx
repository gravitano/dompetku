import type { Metadata } from "next";

export const metadata: Metadata = { title: "Daftar" };

// Placeholder — form registrasi diimplementasikan di story E01-US01.
export default function RegisterPage() {
  return (
    <h1
      data-testid="register-title"
      className="text-center text-2xl font-semibold"
    >
      Daftar
    </h1>
  );
}
