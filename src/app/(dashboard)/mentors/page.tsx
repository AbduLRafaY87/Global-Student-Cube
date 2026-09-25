import { EmptyState, ErrorState } from "@/components/ui/States";
import { ALUMNI_TOPIC_GROUPS, INDUSTRY_GROUPS, PARENT_TOPIC_GROUPS, labelForTaxonomy } from "@/domain/mentorship/taxonomy";
import { loadPublishedMentors } from "@/server/modules/mentorship/load";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Mentor community" };

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

export default async function MentorsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const kind = typeof params.kind === "string" ? params.kind : "alumni";
  const topic = typeof params.topic === "string" ? params.topic : "";
  const university = typeof params.university === "string" ? params.university : "";
  const sector = typeof params.sector === "string" ? params.sector : "";
  const loaded = await loadPublishedMentors({
    kind: kind === "parent" ? "parent" : "alumni",
    topic,
    university,
    sector,
  });

  if (!loaded.ok) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-8">
        <ErrorState />
      </div>
    );
  }

  const mentors = asArray(loaded.data.mentors);
  const monthly = asArray(loaded.data.monthly);
  const annual = asArray(loaded.data.annual);
  const topicGroups = kind === "parent" ? PARENT_TOPIC_GROUPS : ALUMNI_TOPIC_GROUPS;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-4 py-8">
      <header>
        <h1 className="text-2xl font-semibold text-text">Mentor community</h1>
        <p className="mt-2 text-sm text-text-muted">
          Verified contributions only. Filtered discovery never reveals mentee private details.
        </p>
      </header>
      <section className="rounded-[var(--radius-card)] border border-border bg-surface p-4">
        <h2 className="text-lg font-semibold text-text">Contribution rules</h2>
        <p className="mt-2 text-sm text-text-muted">
          Unique mentees count once. 25 points are awarded once after a logged, rated and
          admin-approved session. Contribution tier and verification are separate labels.
        </p>
        <Link className="mt-3 inline-flex h-12 items-center text-primary underline-offset-2 hover:underline" href="/mentors">
          View contribution rules
        </Link>
      </section>
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-text">Monthly leaderboard</h2>
        {monthly.length === 0 ? (
          <EmptyState title="Insufficient activity" message="The monthly leaderboard is empty until verified contributions exist." />
        ) : (
          <ol className="space-y-2">
            {monthly.map((row) => {
              const item = row as Record<string, unknown>;
              return (
                <li key={asString(item.mentorId)} className="rounded-[var(--radius-card)] border border-border bg-surface p-3">
                  <p className="text-sm font-medium text-text">{asString(item.displayName)}</p>
                  <p className="text-sm text-text-muted">
                    {asString(item.uniqueMentees)} unique mentees · {asString(item.ratingLabel)}
                  </p>
                </li>
              );
            })}
          </ol>
        )}
      </section>
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-text">Annual leaderboard</h2>
        {annual.length === 0 ? (
          <EmptyState title="Insufficient activity" message="The annual leaderboard is empty until verified contributions exist." />
        ) : (
          <ol className="space-y-2">
            {annual.map((row) => {
              const item = row as Record<string, unknown>;
              return (
                <li key={asString(item.mentorId)} className="rounded-[var(--radius-card)] border border-border bg-surface p-3">
                  <p className="text-sm font-medium text-text">{asString(item.displayName)}</p>
                  <p className="text-sm text-text-muted">
                    {asString(item.uniqueMentees)} unique mentees · {asString(item.ratingLabel)}
                  </p>
                </li>
              );
            })}
          </ol>
        )}
      </section>
      <form className="grid gap-3 min-[600px]:grid-cols-2" method="get">
        <label className="block space-y-2 text-sm" htmlFor="kind">
          <span className="font-medium text-text">Mentor family</span>
          <select id="kind" name="kind" defaultValue={kind} className="h-12 w-full rounded-[var(--radius-control)] border border-control-border bg-surface px-3">
            <option value="alumni">Student and alumni mentors</option>
            <option value="parent">Parent mentors</option>
          </select>
        </label>
        <label className="block space-y-2 text-sm" htmlFor="topic">
          <span className="font-medium text-text">Topic</span>
          <select id="topic" name="topic" defaultValue={topic} className="h-12 w-full rounded-[var(--radius-control)] border border-control-border bg-surface px-3">
            <option value="">All topics</option>
            {topicGroups.flatMap((group) =>
              group.leaves.map((leaf) => (
                <option key={leaf.id} value={leaf.id}>
                  {leaf.label}
                </option>
              )),
            )}
          </select>
        </label>
        {kind !== "parent" ? (
          <>
            <label className="block space-y-2 text-sm" htmlFor="university">
              <span className="font-medium text-text">University</span>
              <input
                id="university"
                name="university"
                defaultValue={university}
                className="h-12 w-full rounded-[var(--radius-control)] border border-control-border bg-surface px-3"
              />
            </label>
            <label className="block space-y-2 text-sm" htmlFor="sector">
              <span className="font-medium text-text">Sector</span>
              <select id="sector" name="sector" defaultValue={sector} className="h-12 w-full rounded-[var(--radius-control)] border border-control-border bg-surface px-3">
                <option value="">All sectors</option>
                {INDUSTRY_GROUPS.flatMap((group) =>
                  group.leaves.map((leaf) => (
                    <option key={leaf.id} value={leaf.id}>
                      {leaf.label}
                    </option>
                  )),
                )}
              </select>
            </label>
          </>
        ) : null}
        <ButtonLikeSubmit />
      </form>
      {mentors.length === 0 ? (
        <EmptyState
          title="No approved mentors"
          message="Unverified mentors are excluded. Nothing here yet."
        />
      ) : (
        <ul className="grid gap-4 min-[600px]:grid-cols-2">
          {mentors.map((row) => {
            const item = row as Record<string, unknown>;
            const topics = asArray(item.topics).filter((entry): entry is string => typeof entry === "string");
            return (
              <li key={asString(item.id)} className="rounded-[var(--radius-card)] border border-border bg-surface p-4">
                <p className="text-sm font-medium text-text">{asString(item.displayName)}</p>
                <p className="text-sm text-text-muted">Verified · {asString(item.ratingLabel)}</p>
                <p className="mt-2 text-sm text-text">
                  {topics.map(labelForTaxonomy).join(" · ") || "Not provided"}
                </p>
                <Link
                  className="mt-3 inline-flex h-12 items-center text-primary underline-offset-2 hover:underline"
                  href={`/mentors/${asString(item.id)}`}
                >
                  View mentor
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function ButtonLikeSubmit() {
  return (
    <button
      type="submit"
      className="inline-flex h-12 items-center justify-center rounded-[var(--radius-control)] bg-primary px-4 text-surface"
    >
      Apply filters
    </button>
  );
}
