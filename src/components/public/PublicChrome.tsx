import Link from "next/link";
import type { ReactNode } from "react";

interface PublicChromeProps {
  children: ReactNode;
}

export function PublicChrome({ children }: PublicChromeProps) {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-background">
      <header className="border-b border-border bg-surface">
        <nav
          aria-label="Public"
          className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4"
        >
          <Link href="/" className="text-sm font-semibold text-text">
            Global Student Cube
          </Link>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <Link className="text-primary underline-offset-2 hover:underline" href="/quick-match">
              Match
            </Link>
            <Link
              className="text-primary underline-offset-2 hover:underline"
              href="/explore/universities"
            >
              Universities
            </Link>
            <Link
              className="text-primary underline-offset-2 hover:underline"
              href="/preview/scholarships"
            >
              Scholarships
            </Link>
            <Link className="text-primary underline-offset-2 hover:underline" href="/stories">
              Stories
            </Link>
            <Link className="text-primary underline-offset-2 hover:underline" href="/tour">
              Tour
            </Link>
            <Link className="text-primary underline-offset-2 hover:underline" href="/login">
              Sign in
            </Link>
            <Link
              className="rounded-[var(--radius-control)] bg-primary px-3 py-2 text-surface"
              href="/register"
            >
              Start my journey
            </Link>
          </div>
        </nav>
      </header>
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8">{children}</main>
    </div>
  );
}
