import { EmptyState, ErrorState, ForbiddenState } from "@/components/ui/States";
import { ToneChip } from "@/components/ui/Status";
import { attendanceLabel, sessionStatusLabel } from "@/domain/sessions/display";
import type { AttendanceOutcome } from "@/domain/sessions/attendance";
import type { SessionState } from "@/domain/sessions/state";
import { loadSessionWorkspace } from "@/server/modules/sessions/load";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Appointment" };

interface PageProps {
  params: Promise<{ sessionId: string }>;
}

export default async function SessionDetailPage({ params }: PageProps) {
  const { sessionId } = await params;
  const result = await loadSessionWorkspace(sessionId);

  if (!result.ok) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-8">
        {result.forbidden ? (
          <ForbiddenState message="This appointment is not available to your account." />
        ) : (
          <ErrorState />
        )}
      </div>
    );
  }

  const session = result.data;
  const label = sessionStatusLabel(
    session.sessionState as SessionState,
    session.linkStatus,
  );

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8">
      <header>
        <p className="text-sm text-text-muted">Appointment</p>
        <h1 className="mt-1 text-2xl font-semibold text-text">{label}</h1>
        <div className="mt-3 flex flex-wrap gap-2">
          <ToneChip tone="neutral" label={session.kind} />
          <ToneChip
            tone="warning"
            label={attendanceLabel(session.attendanceOutcome as AttendanceOutcome | null)}
          />
        </div>
      </header>
      <section className="rounded-[var(--radius-card)] border border-border bg-surface p-4">
        <dl className="grid gap-3 text-sm">
          <div>
            <dt className="text-text-muted">Starts</dt>
            <dd className="text-text">{new Date(session.startsAt).toLocaleString()}</dd>
          </div>
          <div>
            <dt className="text-text-muted">Counselor timezone</dt>
            <dd className="text-text">{session.hostTimezone}</dd>
          </div>
          <div>
            <dt className="text-text-muted">Your timezone</dt>
            <dd className="text-text">{session.studentTimezone ?? "Not provided"}</dd>
          </div>
        </dl>
      </section>
      {session.sessionState === "rebooking_required" ? (
        <EmptyState
          title="This meeting was interrupted"
          message="A technical failure is not a completed session. Rebooking is required. If the counselor was absent, an apology and rebooking are offered without blaming the student."
        />
      ) : null}
      <nav className="flex flex-col gap-3">
        <Link
          className="inline-flex h-12 items-center justify-center rounded-[var(--radius-control)] bg-primary px-4 text-surface"
          href={`/sessions/${session.id}/lobby`}
        >
          Enter lobby
        </Link>
        <Link
          className="inline-flex h-12 items-center justify-center rounded-[var(--radius-control)] border border-control-border px-4 text-text"
          href={`/sessions/${session.id}/consent`}
        >
          Review recording choices
        </Link>
      </nav>
    </div>
  );
}
