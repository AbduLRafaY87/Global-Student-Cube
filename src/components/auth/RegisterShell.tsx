import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

interface RegisterShellProps {
  step: 1 | 2 | 3 | 4;
  title: string;
  backHref: string;
  backLabel: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function RegisterShell({
  step,
  title,
  backHref,
  backLabel,
  children,
  footer,
}: RegisterShellProps) {
  return (
    <section className="w-full max-w-[720px] rounded-[var(--radius-card)] border border-border bg-surface p-4 min-[768px]:p-6 max-[359px]:border-0 max-[359px]:p-0">
      <header className="flex h-14 items-center gap-2">
        <Link
          href={backHref}
          className="inline-flex size-12 items-center justify-center rounded-[var(--radius-control)] text-text hover:bg-neutral-100"
          aria-label={backLabel}
        >
          <ArrowLeft className="size-6" aria-hidden />
        </Link>
        <p className="text-sm text-text-muted">Step {step}/4</p>
      </header>
      <h1 className="mt-2 text-2xl leading-8 font-semibold text-text min-[1200px]:text-[32px] min-[1200px]:leading-10">
        {title}
      </h1>
      <div className="mt-6 space-y-4">{children}</div>
      {footer ? <div className="mt-8">{footer}</div> : null}
    </section>
  );
}
