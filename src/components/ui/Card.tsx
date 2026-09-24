import type { ReactNode } from "react";

interface CardProps {
  title: string;
  meta?: string;
  action?: ReactNode;
  footer?: ReactNode;
  children?: ReactNode;
}

export function Card({ title, meta, action, footer, children }: CardProps) {
  return (
    <article className="rounded-[var(--radius-card)] border border-border bg-surface p-4 min-[900px]:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-lg leading-7 font-semibold text-text">{title}</h3>
          {meta ? (
            <p className="mt-1 text-sm leading-5 text-text-muted">{meta}</p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {children ? <div className="mt-4">{children}</div> : null}
      {footer ? <div className="mt-4">{footer}</div> : null}
    </article>
  );
}
