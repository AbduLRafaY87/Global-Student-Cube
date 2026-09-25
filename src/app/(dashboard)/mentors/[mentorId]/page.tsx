import { MentorRequestForm } from "@/components/mentorship/MentorRequestForm";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { labelForTaxonomy } from "@/domain/mentorship/taxonomy";
import { loadPublishedMentor } from "@/server/modules/mentorship/load";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Mentor profile" };

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export default async function MentorProfilePage({
  params,
}: {
  params: Promise<{ mentorId: string }>;
}) {
  const { mentorId } = await params;
  const loaded = await loadPublishedMentor(mentorId);
  if (!loaded.ok) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-8">
        {loaded.forbidden ? (
          <EmptyState title="Mentor not available" message="Approved, published mentor profiles only." />
        ) : (
          <ErrorState />
        )}
      </div>
    );
  }
  const mentor = loaded.data;
  const topics = asArray(mentor.topics);
  const kind = asString(mentor.kind);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8">
      <Link className="text-sm text-primary underline-offset-2 hover:underline" href="/mentors">
        Back to community
      </Link>
      <header>
        <p className="text-sm text-text-muted">Verified · {asString(mentor.ratingLabel)}</p>
        <h1 className="text-2xl font-semibold text-text">{asString(mentor.displayName)}</h1>
        {kind === "parent" ? (
          <p className="mt-2 text-sm text-text-muted">
            Parent mentor. Child education and family finances are never shown.
          </p>
        ) : (
          <p className="mt-2 text-sm text-text">
            {asString(mentor.universityAttended)} · {asString(mentor.course)} ·{" "}
            {mentor.graduationIsAnticipated === true ? "Anticipated" : "Graduated"}{" "}
            {asString(mentor.graduationYear)}
          </p>
        )}
      </header>
      <section className="rounded-[var(--radius-card)] border border-border bg-surface p-4">
        <h2 className="text-lg font-semibold text-text">Topics</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-text">
          {topics.map((topic) => (
            <li key={topic}>{labelForTaxonomy(topic)}</li>
          ))}
        </ul>
        {kind === "alumni" ? (
          <p className="mt-3 text-sm text-text-muted">
            {asString(mentor.currentOrganization) || "Not provided"} · {asString(mentor.role) || "Not provided"}
          </p>
        ) : null}
        <p className="mt-3 text-sm text-text">{asString(mentor.reflection) || "Not provided"}</p>
      </section>
      <section className="rounded-[var(--radius-card)] border border-border bg-surface p-4">
        <h2 className="text-lg font-semibold text-text">Request a connection</h2>
        <MentorRequestForm
          mentorId={asString(mentor.id)}
          topics={topics}
          hours={asNumber(mentor.monthlyAvailabilityHours)}
        />
      </section>
    </div>
  );
}
