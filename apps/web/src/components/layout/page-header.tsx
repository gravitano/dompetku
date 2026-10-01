import type { ReactNode } from "react";

type PageHeaderProps = {
  title: string;
  description?: string;
  actions?: ReactNode;
  /** `data-testid` deskripsi (mis. judul periode Beranda). */
  descriptionTestId?: string;
};

export function PageHeader({
  title,
  description,
  actions,
  descriptionTestId,
}: PageHeaderProps) {
  return (
    <div className="mb-4 flex items-start justify-between gap-4">
      <div>
        <h1 data-testid="page-title" className="text-2xl font-semibold">
          {title}
        </h1>
        {description ? (
          <p
            data-testid={descriptionTestId}
            className="text-sm text-muted-foreground"
          >
            {description}
          </p>
        ) : null}
      </div>
      {actions}
    </div>
  );
}
