"use client";

import {
  ChevronDownIcon,
  ChevronRightIcon,
  LoaderCircleIcon,
  PlusIcon,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "~/components/layout/page-header";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import { restoreCategoryAction } from "~/modules/categories/actions";
import type { ManagedCategory } from "~/modules/categories/options";
import {
  CATEGORY_MESSAGES as M,
  categoriesHref,
  type CategoryKind,
} from "~/modules/categories/schema";

import { CategoryFormSheet } from "./category-form-sheet";
import { CategoryIcon } from "./category-icon";

type CategoriesViewProps = {
  categories: ManagedCategory[];
  initialTab: CategoryKind;
};

const TABS: ReadonlyArray<{
  type: CategoryKind;
  label: string;
  testId: string;
  activeClass: string;
}> = [
  {
    type: "EXPENSE",
    label: "Pengeluaran",
    testId: "category-tab-expense",
    activeClass: "bg-background text-expense shadow-sm",
  },
  {
    type: "INCOME",
    label: "Pemasukan",
    testId: "category-tab-income",
    activeClass: "bg-background text-income shadow-sm",
  },
];

function countLabel(count: number) {
  return `${count.toLocaleString("id-ID")} transaksi`;
}

/**
 * Halaman Kelola Kategori (E02-US05): tab Pengeluaran | Pemasukan, tombol
 * "+ Tambah kategori", daftar kategori aktif (tap → form ubah) dan bagian
 * "Diarsipkan" yang bisa dilipat (aksi "Aktifkan kembali"). Data dari server;
 * setiap aksi me-revalidate halaman sehingga daftar langsung diperbarui.
 */
export function CategoriesView({
  categories,
  initialTab,
}: CategoriesViewProps) {
  const [tab, setTab] = useState<CategoryKind>(initialTab);
  const [archivedOpen, setArchivedOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<ManagedCategory | null>(null);
  /** Naik setiap form dibuka agar form selalu mulai dari data terbaru. */
  const [session, setSession] = useState(0);
  const [restoring, setRestoring] = useState<string | null>(null);
  const restoringRef = useRef(false);

  const ofType = categories.filter((c) => c.type === tab);
  const active = ofType.filter((c) => !c.archived);
  const archived = ofType.filter((c) => c.archived);

  function selectTab(next: CategoryKind) {
    if (next === tab) return;
    setTab(next);
    setArchivedOpen(false);
    // Tab tersimpan di URL (tanpa request ulang) agar refresh / Back konsisten.
    window.history.replaceState(null, "", categoriesHref(next));
  }

  function openForm(category: ManagedCategory | null) {
    setEditing(category);
    setSession((value) => value + 1);
    setSheetOpen(true);
  }

  async function restore(category: ManagedCategory) {
    if (restoringRef.current) return;
    restoringRef.current = true;
    setRestoring(category.id);
    let message: string | null = null;
    try {
      const result = await restoreCategoryAction({ id: category.id });
      if (!result.success) {
        message =
          result.error.code === "INTERNAL_ERROR"
            ? M.systemError
            : result.error.message;
      }
    } catch {
      message = M.systemError;
    }
    restoringRef.current = false;
    setRestoring(null);
    if (message) toast.error(message, { id: "category-restore-error" });
    else toast.success(M.restored, { duration: 3000 });
  }

  return (
    <div data-testid="categories-page" data-tab={tab}>
      <PageHeader
        title="Kategori"
        description="Atur kategori pemasukan dan pengeluaranmu."
      />

      <div
        role="tablist"
        aria-label="Jenis kategori"
        data-testid="category-tabs"
        className="mb-4 grid grid-cols-2 gap-1 rounded-lg bg-muted p-1 md:max-w-sm"
      >
        {TABS.map((option) => {
          const selected = option.type === tab;
          return (
            <button
              key={option.type}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls="category-panel"
              data-state={selected ? "active" : "inactive"}
              data-testid={option.testId}
              tabIndex={selected ? 0 : -1}
              onClick={() => selectTab(option.type)}
              onKeyDown={(event) => {
                if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return;
                event.preventDefault();
                const other = TABS.find((o) => o.type !== tab)!;
                selectTab(other.type);
                event.currentTarget.parentElement
                  ?.querySelector<HTMLButtonElement>(
                    `[data-testid="${other.testId}"]`,
                  )
                  ?.focus();
              }}
              className={cn(
                "h-9 rounded-md text-sm font-medium text-muted-foreground transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                selected ? option.activeClass : "hover:text-foreground",
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      <div
        id="category-panel"
        role="tabpanel"
        aria-label={
          tab === "INCOME" ? "Kategori pemasukan" : "Kategori pengeluaran"
        }
        className="flex flex-col gap-4 md:max-w-2xl"
      >
        <Button
          variant="outline"
          data-testid="category-add-button"
          className="h-11 justify-start gap-2 border-dashed"
          onClick={() => openForm(null)}
        >
          <PlusIcon aria-hidden />
          Tambah kategori
        </Button>

        <ul
          data-testid="category-active-list"
          className="divide-y overflow-hidden rounded-xl border bg-card"
        >
          {active.map((category) => (
            <li key={category.id}>
              <button
                type="button"
                data-testid={`category-row-${category.slug}`}
                data-archived="false"
                onClick={() => openForm(category)}
                className="flex w-full items-center gap-3 px-3 py-3 text-left transition-colors outline-none hover:bg-muted/60 focus-visible:bg-muted/60"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <CategoryIcon icon={category.icon} />
                </span>
                <span
                  data-testid="category-row-name"
                  className="min-w-0 flex-1 truncate font-medium"
                >
                  {category.name}
                </span>
                <span
                  data-testid="category-row-count"
                  className="shrink-0 text-xs text-muted-foreground tabular-nums"
                >
                  {countLabel(category.transactionCount)}
                </span>
                <ChevronRightIcon
                  className="size-4 shrink-0 text-muted-foreground"
                  aria-hidden
                />
              </button>
            </li>
          ))}
        </ul>

        {archived.length > 0 ? (
          <section
            data-testid="category-archived-section"
            data-state={archivedOpen ? "open" : "closed"}
            className="flex flex-col gap-2"
          >
            <button
              type="button"
              data-testid="category-archived-toggle"
              aria-expanded={archivedOpen}
              aria-controls="category-archived-list"
              onClick={() => setArchivedOpen((value) => !value)}
              className="flex items-center gap-1 self-start rounded-md px-1 py-1 text-sm font-medium text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <ChevronDownIcon
                className={cn(
                  "size-4 transition-transform",
                  !archivedOpen && "-rotate-90",
                )}
                aria-hidden
              />
              Diarsipkan ({archived.length})
            </button>
            {archivedOpen ? (
              <ul
                id="category-archived-list"
                data-testid="category-archived-list"
                className="divide-y overflow-hidden rounded-xl border bg-card"
              >
                {archived.map((category) => (
                  <li
                    key={category.id}
                    data-testid={`category-row-${category.slug}`}
                    data-archived="true"
                    className="flex items-center gap-3 px-3 py-2.5"
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground opacity-60">
                      <CategoryIcon icon={category.icon} />
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col opacity-60">
                      <span
                        data-testid="category-row-name"
                        className="truncate font-medium"
                      >
                        {category.name}
                      </span>
                      <span
                        data-testid="category-row-count"
                        className="text-xs text-muted-foreground tabular-nums"
                      >
                        {countLabel(category.transactionCount)}
                      </span>
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      data-testid={`category-restore-button-${category.slug}`}
                      disabled={restoring !== null}
                      aria-busy={restoring === category.id}
                      onClick={() => void restore(category)}
                    >
                      {restoring === category.id ? (
                        <LoaderCircleIcon
                          className="animate-spin"
                          aria-hidden
                        />
                      ) : null}
                      Aktifkan kembali
                    </Button>
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        ) : null}
      </div>

      <CategoryFormSheet
        key={session}
        open={sheetOpen}
        type={editing?.type ?? tab}
        category={editing}
        onClose={() => setSheetOpen(false)}
        onDone={(message, action) => {
          setSheetOpen(false);
          if (action === "archive") setArchivedOpen(true);
          toast.success(message, { duration: 3000 });
        }}
      />
    </div>
  );
}
