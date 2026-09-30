import { CheckIcon, CircleIcon, XIcon } from "lucide-react";

import { cn } from "~/lib/utils";
import { PASSWORD_RULES } from "~/modules/auth/schema";

type PasswordRequirementsProps = {
  password: string;
  id?: string;
};

/**
 * Checklist syarat password, tampil sebelum user mengetik dan diperbarui
 * real-time (E01-US01 AC 3, UX-03). Abu-abu saat kosong, hijau saat terpenuhi.
 */
export function PasswordRequirements({
  password,
  id,
}: PasswordRequirementsProps) {
  const typed = password.length > 0;

  return (
    <ul
      id={id}
      data-testid="register-password-rules"
      aria-label="Syarat password"
      className="flex flex-col gap-1 text-xs"
    >
      {PASSWORD_RULES.map((rule) => {
        const met = rule.test(password);
        const state = met ? "met" : typed ? "unmet" : "idle";
        const Icon = met ? CheckIcon : typed ? XIcon : CircleIcon;
        return (
          <li
            key={rule.key}
            data-testid={`register-password-rule-${rule.key}`}
            data-state={state}
            className={cn(
              "flex items-center gap-1.5 text-muted-foreground",
              met && "text-emerald-600 dark:text-emerald-400",
            )}
          >
            <Icon className="size-3.5" aria-hidden />
            <span>{rule.label}</span>
            <span className="sr-only">
              {met ? "(terpenuhi)" : "(belum terpenuhi)"}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
