import { ConsentForm } from "@/app/(dashboard)/sessions/[sessionId]/consent/ConsentForm";
import { ErrorState, ForbiddenState } from "@/components/ui/States";
import { ToneChip } from "@/components/ui/Status";
import { recordingStatusLabel } from "@/domain/sessions/display";
import type { RecordingState } from "@/domain/sessions/consent";
import {
  RECORDING_RETENTION_DAYS,
  TRANSCRIPT_RETENTION_DAYS,
} from "@/domain/sessions/consent";
import { loadSessionWorkspace } from "@/server/modules/sessions/load";
import { Shield } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Recording consent" };

interface PageProps {
  params: Promise<{ sessionId: string }>;
  searchParams: Promise<{ from?: string }>;
}

export default async function SessionConsentPage({
  params,
  searchParams,
}: PageProps) {
  const { sessionId } = await params;
  const query = await searchParams;
  const result = await loadSessionWorkspace(sessionId);

  if (!result.ok) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-8">
        {result.forbidden ? <ForbiddenState /> : <ErrorState />}
      </div>
    );
  }

  const session = result.data;
  const fromLive = query.from === "live";
  const returnTo = fromLive
    ? `/sessions/${session.id}/live`
    : `/sessions/${session.id}/lobby`;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8">
      <header>
        <p className="text-sm text-text-muted">This session only</p>
        <h1 className="mt-1 flex items-center gap-2 text-2xl font-semibold text-text">
          <Shield className="size-6" aria-hidden />
          Recording consent
        </h1>
        <p className="mt-2 text-sm text-text-muted">
          Recording is off by default. A late join cannot inherit another
          participant’s consent.
        </p>
        <div className="mt-3">
          <ToneChip
            tone="neutral"
            label={recordingStatusLabel(session.recordingState as RecordingState)}
          />
        </div>
      </header>
      <section className="rounded-[var(--radius-card)] border border-border bg-surface p-4 text-sm text-text">
        <p>
          Recording is for a counselor draft and quality review. Students see only
          an approved advisory later, never the raw recording or AI notes.
        </p>
        <p className="mt-3">
          Retention: recording {RECORDING_RETENTION_DAYS} days, transcript{" "}
          {TRANSCRIPT_RETENTION_DAYS} days, then the advisory and case-history
          deletion workflow.
        </p>
      </section>
      <ul className="space-y-2 text-sm">
        {session.participants.map((participant) => (
          <li key={participant.accountId} className="flex justify-between gap-3">
            <span className="text-text">{participant.role}</span>
            <span className="text-text-muted">{participant.consent}</span>
          </li>
        ))}
      </ul>
      {session.isMinor && !session.guardianConsented ? (
        <p className="text-sm text-warning">
          Unresolved guardian consent prevents recording. You may still join the
          unrecorded meeting.
        </p>
      ) : null}
      <ConsentForm
        sessionId={session.id}
        returnTo={returnTo}
        asGuardian={session.actorRole === "guardian" || session.actorRole === "parent"}
        isMinor={session.isMinor}
      />
      <Link className="text-sm text-primary underline-offset-2 hover:underline" href="/privacy">
        Privacy details
      </Link>
    </div>
  );
}
