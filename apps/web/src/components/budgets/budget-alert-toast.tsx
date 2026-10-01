"use client";

import { XIcon } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { cn } from "~/lib/utils";
import {
  BUDGET_ALERT_MESSAGES as M,
  budgetAlertMessage,
  type BudgetAlert,
} from "~/modules/budgets/alerts";
import { budgetsHref } from "~/modules/budgets/schema";

import { BudgetAlertIcon } from "./budget-alert-banner";

/** Toast berlatar solid (di atas konten) + aksen warna level. */
const TOAST_TONE = {
  warning: "border-budget-warning text-budget-warning-text",
  over: "border-budget-over text-budget-over-text",
} as const;

/** Toast peringatan tampil lebih lama dari toast sukses (±6 detik, UX-01). */
export const BUDGET_ALERT_TOAST_DURATION = 6000;

/**
 * Tampilkan toast peringatan anggaran (E03-US03 UX-01/UX-02) — dipanggil
 * SETELAH toast "Pengeluaran tersimpan"/"Perubahan tersimpan". Tanpa
 * peringatan (`null`) tidak melakukan apa pun.
 */
export function showBudgetAlertToast(alert: BudgetAlert | null | undefined) {
  if (!alert) return;
  toast.custom((id) => <BudgetAlertToast alert={alert} toastId={id} />, {
    duration: BUDGET_ALERT_TOAST_DURATION,
    // Satu peringatan per penyimpanan; simpan berikutnya menggantikannya.
    id: "budget-alert",
  });
}

function BudgetAlertToast({
  alert,
  toastId,
}: {
  alert: BudgetAlert;
  toastId: string | number;
}) {
  const over = alert.level === "over";
  return (
    <div
      data-testid="budget-alert-toast"
      data-level={alert.level}
      // Merah diumumkan segera, kuning sopan (aksesibilitas design).
      role={over ? "alert" : "status"}
      className={cn(
        "flex w-full items-start gap-3 rounded-lg border border-l-4 bg-popover p-3 text-sm shadow-lg sm:w-[356px]",
        TOAST_TONE[alert.level],
      )}
    >
      <BudgetAlertIcon level={alert.level} className="mt-0.5" />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <p
          data-testid="budget-alert-toast-message"
          className="font-medium text-foreground"
        >
          {budgetAlertMessage(alert)}
        </p>
        <Link
          href={budgetsHref()}
          data-testid="budget-alert-toast-link"
          className="self-start font-semibold underline underline-offset-4"
          onClick={() => toast.dismiss(toastId)}
        >
          {M.seeBudget}
        </Link>
      </div>
      <button
        type="button"
        data-testid="budget-alert-toast-close"
        aria-label={M.close}
        className="-m-1 rounded-md p-1 text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
        onClick={() => toast.dismiss(toastId)}
      >
        <XIcon className="size-4" aria-hidden />
      </button>
    </div>
  );
}
