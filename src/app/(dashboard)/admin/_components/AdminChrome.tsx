import Link from "next/link";
import type { ReactNode } from "react";

interface AdminChromeProps {
  title: string;
  description: string;
  children: ReactNode;
}

export function AdminChrome({ title, description, children }: AdminChromeProps) {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8">
      <header className="flex flex-col gap-3 min-[900px]:flex-row min-[900px]:items-end min-[900px]:justify-between">
        <div>
          <p className="text-sm text-text-muted">Administration</p>
          <h1 className="mt-1 text-2xl font-semibold text-text">{title}</h1>
          <p className="mt-2 max-w-2xl text-sm text-text-muted">{description}</p>
        </div>
        <nav aria-label="Admin sections" className="flex flex-wrap gap-3 text-sm">
          <Link className="text-primary underline-offset-2 hover:underline" href="/admin">
            Overview
          </Link>
          <Link
            className="text-primary underline-offset-2 hover:underline"
            href="/admin/approvals"
          >
            Reviews
          </Link>
          <Link
            className="text-primary underline-offset-2 hover:underline"
            href="/admin/users"
          >
            People
          </Link>
          <Link
            className="text-primary underline-offset-2 hover:underline"
            href="/admin/audit"
          >
            Audit
          </Link>
          <Link
            className="text-primary underline-offset-2 hover:underline"
            href="/admin/support"
          >
            Support
          </Link>
          <Link
            className="text-primary underline-offset-2 hover:underline"
            href="/admin/catalog"
          >
            Catalog
          </Link>
          <Link
            className="text-primary underline-offset-2 hover:underline"
            href="/admin/ingestion/new"
          >
            Ingestion
          </Link>
        </nav>
      </header>
      {children}
    </div>
  );
}
