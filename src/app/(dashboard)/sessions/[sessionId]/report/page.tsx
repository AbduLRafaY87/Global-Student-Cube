import { EmptyState, ErrorState, ForbiddenState } from "@/components/ui/States";
import { ADVISORY_DISCLAIMER } from "@/domain/counseling/advisory";
import { loadStudentAdvisory } from "@/server/modules/counseling/load";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Advisory report" };

interface PageProps {
  params: Promise<{ sessionId: string }>;
}

export default async function StudentAdvisoryPage({ params }: PageProps) {
  const { sessionId } = await params;
  const result = await loadStudentAdvisory(sessionId);
  if (!result.ok) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-8">
        {result.forbidden ? <ForbiddenState /> : <ErrorState />}
      </div>
    );
  }
  const data = result.data;
  const shareable = data.shareableBody as {
    guidance?: string;
    fits?: Array<{ score: number; rationale: string; label?: string }>;
  } | null;

  if (!shareable) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-8">
        <EmptyState title="Counselor reviewing" message="The approved advisory is not available yet." />
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8">
      <header>
        <h1 className="text-2xl font-semibold text-text">Approved advisory</h1>
        <p className="mt-2 text-sm text-text-muted">
          Version {String(data.revision ?? "1")} · {String(data.status)}
        </p>
      </header>
      <article className="rounded-[var(--radius-card)] border border-border bg-surface p-4 text-sm text-text">
        <p>{shareable.guidance}</p>
        {shareable.fits?.map((fit, index) => (
          <p key={index} className="mt-3">
            Fit {fit.score}: {fit.label ?? ""} — {fit.rationale}
          </p>
        ))}
        <p className="mt-4 text-text-muted">{ADVISORY_DISCLAIMER}</p>
      </article>
      <p className="sr-only">
        Text alternative for any uploaded advisory PDF. Private notes and AI
        coaching are excluded.
      </p>
      <nav className="flex flex-col gap-3">
        <Link
          className="inline-flex h-12 items-center justify-center rounded-[var(--radius-control)] bg-primary px-4 text-surface"
          href={`/sessions/${sessionId}/feedback`}
        >
          Give feedback
        </Link>
        <Link
          className="text-sm text-primary underline-offset-2 hover:underline"
          href="/family-links"
        >
          Share with parent
        </Link>
      </nav>
    </div>
  );
}
