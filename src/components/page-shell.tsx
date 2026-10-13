import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>
      </div>
      {actions}
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  body,
  children,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-card/50 px-6 py-12 text-center">
      <div className="mb-3 grid size-10 place-items-center rounded-md bg-accent text-accent-foreground">
        <Icon className="size-5" />
      </div>
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{body}</p>
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}

export function Unavailable({ label = "Not available yet" }: { label?: string }) {
  return (
    <span className="rounded border border-dashed px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
      {label}
    </span>
  );
}
