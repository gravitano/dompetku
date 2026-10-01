import { CircleAlertIcon, CircleCheckIcon, InfoIcon } from "lucide-react";

import { cn } from "~/lib/utils";

export type AuthAlertVariant = "error" | "success" | "info";

type AuthAlertProps = {
  variant: AuthAlertVariant;
  message: string;
};

const ICONS = {
  error: CircleAlertIcon,
  success: CircleCheckIcon,
  info: InfoIcon,
} as const;

/**
 * Banner pesan di atas form auth (E01-US02 UX-05): error login, terkunci,
 * "Anda telah keluar", gagal koneksi.
 */
export function AuthAlert({ variant, message }: AuthAlertProps) {
  const Icon = ICONS[variant];
  return (
    <div
      role={variant === "error" ? "alert" : "status"}
      data-testid="auth-alert"
      data-variant={variant}
      className={cn(
        "flex items-start gap-2 rounded-lg border px-3 py-2 text-sm",
        variant === "error" &&
          "border-destructive/30 bg-destructive/10 text-destructive",
        variant === "success" &&
          "border-emerald-600/30 bg-emerald-600/10 text-emerald-700 dark:text-emerald-400",
        variant === "info" && "border-border bg-muted text-foreground",
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>{message}</span>
    </div>
  );
}
