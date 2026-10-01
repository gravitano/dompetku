import { InfoIcon } from "lucide-react";

import { Button } from "~/components/ui/button";
import type { DemoCredentials } from "~/modules/auth/demo";

type DemoAccountInfoProps = {
  credentials: DemoCredentials;
  /** Mengisi field email & password di form login (tanpa submit). */
  onUse: () => void;
  disabled?: boolean;
};

/** Kotak info akun demo di halaman login (hanya saat `DEMO_MODE=true`). */
export function DemoAccountInfo({
  credentials,
  onUse,
  disabled,
}: DemoAccountInfoProps) {
  return (
    <section
      data-testid="login-demo-info"
      aria-labelledby="login-demo-title"
      className="flex flex-col gap-3 rounded-lg border border-border bg-muted p-3 text-sm"
    >
      <div className="flex items-start gap-2">
        <InfoIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
        <div className="flex min-w-0 flex-col gap-1">
          <h2 id="login-demo-title" className="font-medium">
            Akun demo
          </h2>
          <p className="text-muted-foreground">
            Berisi data contoh dan bisa dilihat publik. Jangan simpan data
            pribadi.
          </p>
          <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
            <dt className="text-muted-foreground">Email</dt>
            <dd data-testid="login-demo-email" className="font-mono break-all">
              {credentials.email}
            </dd>
            <dt className="text-muted-foreground">Password</dt>
            <dd data-testid="login-demo-password" className="font-mono">
              {credentials.password}
            </dd>
          </dl>
        </div>
      </div>
      <Button
        type="button"
        variant="outline"
        data-testid="login-demo-fill"
        className="h-9 w-full"
        onClick={onUse}
        disabled={disabled}
      >
        Pakai akun demo
      </Button>
    </section>
  );
}
