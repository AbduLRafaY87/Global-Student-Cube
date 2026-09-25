import { EmptyState, ErrorState, ForbiddenState } from "@/components/ui/States";
import { loadMentorDashboard } from "@/server/modules/mentorship/load";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Mentor dashboard" };

function asCount(value: unknown): number {
  return typeof value === "number" ? value : 0;
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export default async function MentorHomePage() {
  const loaded = await loadMentorDashboard();
  if (!loaded.ok) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-8">
        {loaded.forbidden ? <ForbiddenState /> : <ErrorState />}
      </div>
    );
  }
  const data = loaded.data;
  const contributions =
    data.contributions && typeof data.contributions === "object"
      ? (data.contributions as Record<string, unknown>)
      : {};
  const nextRequest =
    data.nextRequest && typeof data.nextRequest === "object"
      ? (data.nextRequest as Record<string, unknown>)
      : null;
  const nextSession =
    data.nextSession && typeof data.nextSession === "object"
      ? (data.nextSession as Record<string, unknown>)
      : null;
  const due = Array.isArray(data.feedbackDue) ? data.feedbackDue : [];
  const pending = data.verificationState !== "approved";
  const profileHref = data.kind === "parent" ? "/mentor/parent-profile" : "/mentor/profile";

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-8">
      <header>
        <h1 className="text-2xl font-semibold text-text">Mentor dashboard</h1>
        <p className="mt-2 text-sm text-text-muted">
          Verification: {asString(data.verificationState) || "none"}. Repeated sessions with one
          mentee count once toward tier. Pending approval points stay separate from spendable points.
        </p>
      </header>
      {pending ? (
        <EmptyState
          title="Complete verification tasks"
          message="Pending mentors see completion tasks instead of private contacts."
          action={
            <Link className="text-primary underline-offset-2 hover:underline" href={profileHref}>
              Update profile
            </Link>
          }
        />
      ) : null}
      <section className="rounded-[var(--radius-card)] border border-border bg-surface p-4">
        <h2 className="text-lg font-semibold text-text">Next request</h2>
        {nextRequest?.id ? (
          <Link
            className="mt-2 inline-flex h-12 items-center text-primary underline-offset-2 hover:underline"
            href={`/mentoring/requests/${asString(nextRequest.id)}`}
          >
            Review requests
          </Link>
        ) : (
          <p className="mt-2 text-sm text-text-muted">No pending request.</p>
        )}
      </section>
      <section className="rounded-[var(--radius-card)] border border-border bg-surface p-4">
        <h2 className="text-lg font-semibold text-text">Next session</h2>
        {nextSession?.id ? (
          <Link
            className="mt-2 inline-flex h-12 items-center text-primary underline-offset-2 hover:underline"
            href={`/sessions/${asString(nextSession.id)}`}
          >
            Open session
          </Link>
        ) : (
          <p className="mt-2 text-sm text-text-muted">No upcoming mentoring session.</p>
        )}
      </section>
      <ul className="grid gap-3 min-[600px]:grid-cols-3">
        <li className="rounded-[var(--radius-card)] border border-border bg-surface p-4">
          <p className="text-sm text-text-muted">Unique mentees</p>
          <p className="mt-2 text-3xl font-semibold">{asCount(contributions.uniqueMentees)}</p>
        </li>
        <li className="rounded-[var(--radius-card)] border border-border bg-surface p-4">
          <p className="text-sm text-text-muted">Verified sessions</p>
          <p className="mt-2 text-3xl font-semibold">{asCount(contributions.verifiedSessions)}</p>
        </li>
        <li className="rounded-[var(--radius-card)] border border-border bg-surface p-4">
          <p className="text-sm text-text-muted">Verified minutes</p>
          <p className="mt-2 text-3xl font-semibold">{asCount(contributions.verifiedMinutes)}</p>
        </li>
      </ul>
      <p className="text-sm text-text-muted">
        Spendable points {asCount(contributions.spendablePoints)}. Pending approval points{" "}
        {asCount(contributions.pendingPoints)}.
      </p>
      <section>
        <h2 className="text-lg font-semibold text-text">Feedback to submit</h2>
        {due.length === 0 ? (
          <p className="mt-2 text-sm text-text-muted">No summaries due.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {due.map((row) => {
              const item = row as Record<string, unknown>;
              return (
                <li key={asString(item.bookingId)}>
                  <Link
                    className="text-primary underline-offset-2 hover:underline"
                    href={`/mentoring/sessions/${asString(item.bookingId)}/summary`}
                  >
                    Complete summary
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
      <Link className="text-primary underline-offset-2 hover:underline" href={profileHref}>
        Update profile
      </Link>
    </div>
  );
}
