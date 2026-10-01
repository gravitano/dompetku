import { WalletIcon } from "lucide-react";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-100">
        <p
          data-testid="auth-logo"
          className="mb-6 flex items-center justify-center gap-2 text-lg font-semibold tracking-tight"
        >
          <WalletIcon className="size-5 text-primary" aria-hidden />
          DompetKu
        </p>
        {children}
      </div>
    </main>
  );
}
