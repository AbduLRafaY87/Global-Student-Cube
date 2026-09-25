import { PublicChrome } from "@/components/public/PublicChrome";
import { EmptyState } from "@/components/ui/States";
import { labelForTaxonomy } from "@/domain/mentorship/taxonomy";
import { loadPublishedMentor } from "@/server/modules/mentorship/load";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mentor teaser",
  description:
    "Published mentor teasers only. Private contact details and mentee identities are never shown.",
};

interface PageProps {
  params: Promise<{ mentorId: string }>;
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

export default async function MentorTeaserPage({ params }: PageProps) {
  const { mentorId } = await params;
  const loaded = await loadPublishedMentor(mentorId);
  const mentor = loaded.ok ? loaded.data : null;

  return (
    <PublicChrome>
      <Link className="text-sm text-primary underline-offset-2 hover:underline" href="/">
        Back
      </Link>
      <h1 className="text-2xl font-semibold text-text">Mentor teaser</h1>
      {mentor ? (
        <section className="mt-4 space-y-2">
          <p className="text-lg font-medium text-text">{asString(mentor.displayName)}</p>
          <p className="text-sm text-text-muted">
            {asArray(mentor.topics).map(labelForTaxonomy).join(" · ")}
          </p>
          <p className="text-sm text-text-muted">
            Private contact details and mentee identities are never shown.
          </p>
        </section>
      ) : (
        <EmptyState
          title="No published mentor teaser"
          message="Approved, published mentor profiles are not available yet. A teaser would never include private contact details or a mentee’s identity."
        />
      )}
      <p className="mt-4 text-sm text-text-muted">
        Browse mentors after publication. Registration is required to ask a question.
      </p>
      <Link
        className="inline-flex h-12 items-center justify-center rounded-[var(--radius-control)] bg-primary px-4 text-surface"
        href="/register"
      >
        Register to ask a question
      </Link>
    </PublicChrome>
  );
}
